require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const Pusher = require('pusher');
const { WaveFile } = require('wavefile');
const { google } = require('googleapis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { connectDB, Lead, Call, ToyFeedback, RoomRatio } = require('./db');


// Initialize MongoDB
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow the Next.js frontend (port 3000) to call our API (port 8080)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const PORT = process.env.PORT || 8080;

console.log('[Startup] Environment Check:');
console.log(' - GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `PRESENT (Length: ${process.env.GEMINI_API_KEY.length})` : 'MISSING');
console.log(' - PUSHER_APP_ID:', process.env.PUSHER_APP_ID ? 'PRESENT' : 'MISSING');

// Initialize Pusher - Use fallbacks carefully (they'll just fail silently if keys are invalid)
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "app_id",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY || "key",
  secret: process.env.PUSHER_SECRET || "secret",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER || "us2",
  useTLS: true
});

// Initialize Google Workspace Clients
const googleAuth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar'
  ],
});

const sheets = google.sheets({ version: 'v4', auth: googleAuth });
const calendar = google.calendar({ version: 'v3', auth: googleAuth });

// Initialize Gemini for Document Content Generation
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function generateLeadDocumentData(parentName, childName, age, medicalNotes) {
  const safeParent = parentName || 'Guardian';
  const safeChild = childName || 'Child';
  const safeAge = age || 'Not Specified';
  const safeMedical = medicalNotes || 'None';

  // Default values in case Gemini fails
  let ageCare = "Standard age-appropriate care and developmental activities.";
  let hiddenAllergens = "No specific restrictions.";

  try {
    const prompt = `
      You are a daycare safety and care expert. Generate personalized content for a new student intake document.
      
      Child Name: ${safeChild}
      Age: ${safeAge} years old
      Known Medical/Allergy Notes: ${safeMedical}
      
      Please provide exactly two sections in plain text:
      1. "AGE_CARE": A short 2-3 sentence paragraph about specific care needs for a ${safeAge}-year-old (e.g., focus on motor skills, potty training, or social play).
      2. "HIDDEN_ALLERGENS": If the notes mention a food allergy (like peanuts, dairy, etc.), list 3-4 surprising or "hidden" foods that might contain that ingredient. If no allergy is mentioned, write "No specific food restrictions identified. Standard healthy daycare menu applies."
      
      Format your response as:
      AGE_CARE: [content here]
      HIDDEN_ALLERGENS: [content here]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    ageCare = text.match(/AGE_CARE:\s*(.*)/)?.[1]?.trim() || ageCare;
    hiddenAllergens = text.match(/HIDDEN_ALLERGENS:\s*(.*)/s)?.[1]?.trim() || hiddenAllergens;
    console.log('[Doc Gen] Gemini content generated successfully.');
  } catch (err) {
    console.error('[Gemini Doc Gen Error]', err.message || err);
    console.log('[Doc Gen] Falling back to defaults — document will still be emitted.');
  }

  // ALWAYS emit the document, even if Gemini failed
  try {
    await pusher.trigger('fawn-live', 'lead-document', {
      parentName: safeParent,
      childName: safeChild,
      age: safeAge,
      medicalNotes: safeMedical,
      ageCare,
      hiddenAllergens,
      timestamp: new Date().toISOString()
    });
    console.log(`[Doc Gen] lead-document event emitted for ${safeChild}`);
  } catch (pusherErr) {
    console.error('[Pusher lead-document error]', pusherErr);
  }
}

async function appendLeadToSheet(name, childName, age, notes = "") {
  try {
    // 1. Save to MongoDB (Permanent Brain)
    const newLead = new Lead({
      parentName: name,
      childName,
      childAge: parseInt(age) || 0,
      medicalNotes: notes
    });
    await newLead.save();
    console.log(`[MongoDB] Lead saved for ${childName}`);

    // 2. Append to Google Sheets (Shared View)
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const range = 'Sheet1!A:E';
    const values = [[
      new Date().toLocaleString(),
      name || "Unknown",
      childName,
      age,
      notes
    ]];
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
    console.log(`[Google Sheets] Lead added for ${childName}`);
  } catch (err) {
    console.error('[DB/Sheets Error]', err.message);
  }
}

function getNYIso(dateInput) {
  const date = new Date(dateInput);
  const f = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'America/New_York', 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', second: '2-digit', 
    hour12: false 
  });
  const p = f.formatToParts(date);
  const g = (t) => p.find(x => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}:${g('second')}`;
}

async function bookTourOnCalendar(name, dateTime) {
  try {
    const event = {
      summary: `Daycare Tour: ${name}`,
      description: `In-person tour booked via Fawn AI`,
      start: {
        dateTime: getNYIso(dateTime),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: getNYIso(new Date(dateTime).getTime() + 30 * 60000),
        timeZone: 'America/New_York',
      },
    };
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      resource: event,
    });
    console.log(`[Google Calendar] Tour booked for ${name} at ${dateTime}`);
  } catch (err) {
    console.error('[Google Calendar Error]', err.message);
  }
}

async function bookDropInOnCalendar(name, roomName) {
    try {
        const soon = new Date(Date.now() + 60 * 60000); // 1 hour from now
        const event = {
            summary: `Drop-In: ${roomName} Room`,
            description: `Automatic drop-in expected via Fawn AI for parent: ${name || 'Unknown'}`,
            start: {
                dateTime: getNYIso(soon),
                timeZone: 'America/New_York',
            },
            end: {
                dateTime: getNYIso(new Date(soon.getTime() + 30 * 60000)),
                timeZone: 'America/New_York',
            },
        };
        await calendar.events.insert({
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            resource: event,
        });
        console.log(`[Google Calendar] Drop-In booked for ${roomName} room at ${soon.toISOString()}`);
    } catch (err) {
        console.error('[Google Calendar Error Drop-In]', err.message);
    }
}

function emitAction(type, title, description, extra = {}) {
  try {
    pusher.trigger('fawn-live', 'action', {
      type,
      title,
      description,
      timestamp: new Date().toISOString(),
      ...extra,
    }).catch(() => {});
  } catch (err) {}
}

function emitCheckIn(childName, checkedInAt, notes) {
  const checkInIso = checkedInAt || new Date().toISOString();
  const summary = notes || `${childName} was checked in successfully.`;

  emitAction(
    "checkin",
    `${childName} checked in`,
    summary,
    {
      childName,
      checkedInAt: checkInIso,
    }
  );
}

function emitTranscript(speaker, text) {
  try {
    pusher.trigger('fawn-live', 'transcript', {
      speaker, text, timestamp: new Date().toISOString()
    }).catch(() => {});
  } catch (err) {}
}

function emitCallStart() {
  try { pusher.trigger('fawn-live', 'call-start', {}).catch(() => {}); } catch(err) {}
}

function emitCallEnd() {
  try { pusher.trigger('fawn-live', 'call-end', {}).catch(() => {}); } catch(err) {}
}

// REST route for incoming Twilio Voice Calls
app.post('/api/voice/inbound', (req, res) => {
  const host = req.headers.host;
  console.log(`[Twilio Inbound webhook] Host: ${host}`);
  const twiml = `
<Response>
  <Connect>
    <Stream url="wss://${host}/api/media" />
  </Connect>
</Response>
  `;
  res.type('text/xml');
  res.send(twiml);
});

app.post('/api/feed/action', (req, res) => {
  const { type, title, description, childName, checkedInAt } = req.body || {};

  if (!type || !title || !description) {
    return res.status(400).json({ error: 'type, title, and description are required' });
  }

  emitAction(type, title, description, { childName, checkedInAt });
  return res.json({ ok: true });
});

app.get('/api/history', async (req, res) => {
  try {
    const historicalLeads = await Lead.find().sort({ createdAt: -1 }).limit(10);
    const historicalCalls = await Call.find().sort({ startTime: -1 }).limit(10);
    
    // Transform into frontend format
    const leads = historicalLeads.map(l => ({
      id: l._id,
      parentName: l.parentName,
      childName: l.childName,
      age: l.childAge,
      medicalNotes: l.medicalNotes,
      status: l.status,
      timestamp: l.createdAt
    }));

    const calls = historicalCalls.map(c => ({
      id: c._id,
      timestamp: c.startTime,
      duration: c.duration || 0,
      status: c.status
    }));

    res.json({ leads, calls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/toys', async (req, res) => {
  try {
    const toys = await ToyFeedback.find().sort({ weekOf: -1 }).limit(20);
    const formatted = toys.map(t => ({
      id: t._id,
      toy: t.toy,
      emoji: t.emoji,
      teacher: t.teacher,
      rating: t.rating,
      quote: t.quote,
      date: t.weekOf ? t.weekOf.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
      tags: t.tags
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/swarm', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const records = await ToyFeedback.find().limit(20);
    const dataStr = JSON.stringify(records.map(r => ({ toy: r.toy, rating: r.rating, quote: r.quote, tags: r.tags })));

    let ai;
    try {
        ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    } catch(e) {
        // Fallback or error if not available
        sendEvent('error', { message: 'Failed to initialize Gemini SDK.' });
        res.end();
        return;
    }

    const agentConfigs = [
      { id: 'safety', instruction: 'Analyze the following toy feedback for safety and age appropriateness. Output exactly 4 short bullet points (1 per line, starting with a dash) summarizing your safety checks.' },
      { id: 'engagement', instruction: 'Rank the toys based on engagement and enthusiasm. Output exactly 4 short bullet points (1 per line, starting with a dash) summarizing your thoughts.' },
      { id: 'budget', instruction: 'Analyze the budget and inventory implications. Assumed budget is $200. Output exactly 4 short bullet points (1 per line, starting with a dash) summarizing your thoughts.' },
      { id: 'dev', instruction: 'Map the toys to developmental milestones. Output exactly 4 short bullet points (1 per line, starting with a dash) summarizing your developmental analysis.' }
    ];

    sendEvent('status', { message: 'Swarm initialized. Triggering parallel processing.' });

    // Run 4 agents in parallel
    const results = await Promise.all(agentConfigs.map(async (agent) => {
      sendEvent('agent_start', { id: agent.id });
      
      let responseText = "";
      try {
        const agentModel = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await agentModel.generateContent(`Toy Data:\n${dataStr}\n\nInstruction: ${agent.instruction}`);
        responseText = result.response.text();
      } catch (err) {
        console.error(`Agent ${agent.id} Error`, err);
        responseText = "- Error calling agent API.\n- Skipping analysis for this agent.";
      }

      const lines = responseText.split('\n').filter(l => l.trim().length > 0);
      lines.forEach((line, i) => {
        sendEvent('agent_message', { id: agent.id, index: i, text: line.replace(/^-/, '').trim() });
      });

      sendEvent('agent_done', { id: agent.id });
      return { id: agent.id, output: responseText };
    }));

    // Consensus Agent
    sendEvent('agent_start', { id: 'consensus' });
    const consensusPrompt = `You are the Arbiter. Here are the thoughts from your 4 sub-agents:
${JSON.stringify(results)}

Based on this, pick the Top 3 toys for next week.
Format your output exactly as a JSON array of objects with the following keys: "toy" (string), "emoji" (string), "reason" (short string), "score" (number out of 100). Do NOT use markdown code blocks, just pure JSON array starting with [ and ending with ].`;

    let consensusResponseText = "[]";
    try {
        const consensusModel = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const consensusResult = await consensusModel.generateContent(consensusPrompt);
        consensusResponseText = consensusResult.response.text();
    } catch (err) {
        console.error("Consensus Error", err);
    }
    
    sendEvent('agent_message', { id: 'consensus', index: 0, text: 'Aggregating signals from 4 parallel agents...' });
    sendEvent('agent_message', { id: 'consensus', index: 1, text: 'Analyzing vote weights and scoring metrics...' });
    sendEvent('agent_message', { id: 'consensus', index: 2, text: '🏆 Consensus reached. Final toy lineup confirmed.' });

    let finalJson;
    try {
      let cleaned = consensusResponseText.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/```json/gi, '').replace(/```/g, '').trim();
      finalJson = JSON.parse(cleaned);
    } catch (e) {
      finalJson = [ { toy: "Parse Error", emoji: "❌", reason: "Failed to parse final selection.", score: 0 } ];
    }

    sendEvent('agent_done', { id: 'consensus' });
    sendEvent('result', finalJson);
    res.end();
  } catch (err) {
    sendEvent('error', { message: err.message });
    res.end();
  }
});

app.post('/api/check-in', (req, res) => {
  const { childName, checkedInAt, notes } = req.body || {};

  if (!childName) {
    return res.status(400).json({ error: 'childName is required' });
  }

  emitCheckIn(childName, checkedInAt, notes);
  return res.json({ ok: true });
});

// Create HTTP server to attach WebSockets
const server = app.listen(PORT, () => {
  console.log(`[Server] WebSocket/TwiML Backend running on port ${PORT}`);
});

// WebSocket Server
const wss = new WebSocket.Server({ server, path: '/api/media' });

wss.on('connection', (twWs) => {
  console.log('[Twilio] Connected');
  let streamSid = null;
  let isSetupComplete = false;
  
  if (!process.env.GEMINI_API_KEY) {
      console.error("[Config Error] GEMINI_API_KEY is missing in .env");
      twWs.close();
      return;
  }

  // Connect to Gemini Realtime API using v1alpha BidiGenerateContent
  const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.GEMINI_API_KEY}`;
  const gemWs = new WebSocket(geminiUrl);

  const setupMsg = {
    setup: {
      model: "models/gemini-2.5-flash-native-audio-latest",
      generation_config: {
        response_modalities: ["AUDIO"],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: "Aoede"
            }
          }
        }
      },
      system_instruction: {
        parts: [{ text: "LANGUAGE: Your default language is English but you are fully bilingual in Spanish. If a parent starts speaking Spanish, you MUST switch to Spanish immediately and permanently. ROLES: You are Fawn, a receptionist for Sunshine Daycare. Answer calls warmly. If asked about being a robot, explain you're an AI helper so teachers can stay with the kids. Keep it brief! TOOL USAGE: If a parent asks for a drop-in spot (plazas libres), you MUST use the CheckRoomAvailability tool. If space is available, you MUST warmly say word-for-word exactly: 'Okay, we will see you later today at any time, thank you!' If the room is full, you must legally decline the drop-in and explain the state-mandated ratios. Do NOT offer a tour if a drop-in is denied. Always conclude by asking 'is there anything else I can help with?' unless they say they are done." }]
      },
      tools: [{
        function_declarations: [
          {
            name: "BookCalendar",
            description: "Books a daycare tour.",
            parameters: {
              type: "OBJECT",
              properties: {
                date_time: { type: "STRING" },
                name: { type: "STRING" }
              },
              required: ["date_time", "name"]
            }
          },
          {
            name: "CheckRoomAvailability",
            description: "Checks the live MongoDB database for the exact capacity of a daycare room to determine if a drop-in can be legally accepted.",
            parameters: {
              type: "OBJECT",
              properties: {
                room_name: { type: "STRING", description: "The name of the room to check. Must be 'Infants', 'Toddlers', or 'Pre-K'" }
              },
              required: ["room_name"]
            }
          },
          {
            name: "GenerateDoc",
            description: "Generates an intake form based on the parent conversation.",
            parameters: {
              type: "OBJECT",
              properties: {
                parent_name: { type: "STRING", description: "The name of the parent or guardian." },
                child_name: { type: "STRING", description: "The name of the child being enrolled." },
                age: { type: "STRING", description: "The age or date of birth of the child." },
                medical_notes: { type: "STRING", description: "Any medical notes or allergies mentioned." }
              },
              required: ["child_name", "age"]
            }
          }
        ]
      }]
    }
  };

  gemWs.on('open', () => {
    console.log('[Gemini] WebSocket OPEN - Sending Setup Message...');
    gemWs.send(JSON.stringify(setupMsg));
    console.log('[Gemini] Setup Payload Sent! Model:', setupMsg.setup.model);
  });

  gemWs.on('close', (code, reason) => {
    console.log(`[Gemini] WebSocket CLOSED. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
  });

  gemWs.on('message', (data) => {
    let msg;
    try {
        msg = JSON.parse(data.toString());
        // Silence raw binary audio logs to keep terminal readable
        if (!msg.serverContent || !msg.serverContent.modelTurn || !msg.serverContent.modelTurn.parts.some(p => p.inlineData)) {
            console.log('[Gemini Message Received]', JSON.stringify(msg, null, 2));
        }
    } catch (e) {
        console.error('[Gemini JSON Parse Error]', data.toString());
        return;
    }
    
    if (msg.setupComplete) {
        isSetupComplete = true;
        console.log('[Gemini] Setup Complete! Fawn is ready.');
        // Ask Gemini to greet the user
        gemWs.send(JSON.stringify({
          clientContent: {
            turns: [{
              role: "user",
              parts: [{ text: "Hello! I am calling Sunshine Daycare." }]
            }],
            turnComplete: true
          }
        }));
    } else if (msg.serverContent && msg.serverContent.modelTurn) {
        let textPart = "";
        let hasAudio = false;
        
        msg.serverContent.modelTurn.parts.forEach(part => {
            // Native audio models only produce "thought" text - use it as transcript
            if (part.text && part.thought) {
                // Extract a clean summary: remove markdown bold markers and take first sentence
                const clean = part.text.replace(/\*\*/g, '').trim();
                const firstLine = clean.split('\n')[0].trim();
                if (firstLine) {
                    console.log(`[Fawn Thinking] ${firstLine}`);
                    emitTranscript('fawn', `🧠 ${firstLine}`);
                }
            }
            if (part.text && !part.thought) {
                textPart += part.text;
            }
            if (part.inlineData) {
                const mimeType = part.inlineData.mimeType || "unknown";
                const pcmData = Buffer.from(part.inlineData.data, 'base64');
                console.log(`[Audio] Received ${pcmData.length} bytes from Gemini (mimeType: ${mimeType}), streamSid: ${streamSid ? 'YES' : 'NO'}`);
                
                try {
                    // Parse sample rate from mimeType (e.g. "audio/pcm;rate=24000")
                    let sampleRate = 24000;
                    const rateMatch = mimeType.match(/rate=(\d+)/);
                    if (rateMatch) sampleRate = parseInt(rateMatch[1]);
                    
                    // Step 1: Read 16-bit signed PCM samples (little-endian)
                    const sampleCount = pcmData.length / 2;
                    const samples16 = new Int16Array(sampleCount);
                    for (let i = 0; i < sampleCount; i++) {
                        samples16[i] = pcmData.readInt16LE(i * 2);
                    }
                    
                    // Step 2: Downsample from source rate to 8000 Hz
                    const ratio = sampleRate / 8000;
                    const outLen = Math.floor(sampleCount / ratio);
                    const downsampled = new Int16Array(outLen);
                    for (let i = 0; i < outLen; i++) {
                        downsampled[i] = samples16[Math.floor(i * ratio)];
                    }
                    
                    // Step 3: Encode each 16-bit sample to 8-bit mu-law (ITU-T G.711)
                    const muLawBytes = Buffer.alloc(outLen);
                    for (let i = 0; i < outLen; i++) {
                        let sample = downsampled[i];
                        const sign = (sample < 0) ? 0x80 : 0x00;
                        if (sample < 0) sample = -sample;
                        if (sample > 32635) sample = 32635;
                        sample += 0x84; // bias
                        let exponent = 7;
                        for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
                        const mantissa = (sample >> (exponent + 3)) & 0x0F;
                        muLawBytes[i] = ~(sign | (exponent << 4) | mantissa) & 0xFF;
                    }
                    
                    const payload = muLawBytes.toString('base64');
                    console.log(`[Audio] Sending ${muLawBytes.length} raw bytes to Twilio`);

                    if (streamSid && twWs.readyState === WebSocket.OPEN) {
                        twWs.send(JSON.stringify({
                            event: 'media',
                            streamSid: streamSid,
                            media: { payload }
                        }));
                    }
                } catch (audioErr) {
                    console.error('[Audio Transcode Error]', audioErr.message);
                }
            }
        });
        
        if (textPart.trim()) {
            console.log(`[Gemini Text] ${textPart.trim()}`);
            emitTranscript('fawn', textPart.trim());
        }
        
    } else if (msg.toolCall) {
        const executeTools = async () => {
            for (const call of msg.toolCall.functionCalls) {
                console.log(`[Gemini ToolCall] ${call.name}`, call.args);
                
                let result = { result: "success" };

                if (call.name === "BookCalendar") {
                    emitAction("calendar", "Tour Booked", `Parent: ${call.args.name}, Time: ${call.args.date_time}`);
                    await bookTourOnCalendar(call.args.name, call.args.date_time);
                } else if (call.name === "GenerateDoc") {
                    emitAction("document", "Generating Intake Form", `Child: ${call.args.child_name || 'Unknown'}, Age: ${call.args.age || 'N/A'}. Med: ${call.args.medical_notes || 'None'}`);
                    
                    // 1. Traditional Storage (Sheets/DB)
                    appendLeadToSheet(
                        call.args.parent_name || "New Parent", 
                        call.args.child_name || "Child", 
                        call.args.age || "Unknown", 
                        call.args.medical_notes
                    );

                    // 2. AI Document Preview Generation — await so it completes before tool response
                    await generateLeadDocumentData(
                        call.args.parent_name || "New Parent",
                        call.args.child_name || "Child",
                        call.args.age || "Unknown",
                        call.args.medical_notes
                    );
                } else if (call.name === "CheckRoomAvailability") {
                    const safeName = call.args.room_name || "Unknown";
                    emitAction("calendar", "Checking Room Ratios", `Querying MongoDB for ${safeName} room.`);
                    
                    try {
                        const allRatios = await RoomRatio.find({});
                        const ratioData = allRatios.find(r => 
                            r.roomName.toLowerCase().includes(safeName.toLowerCase().replace(/s$/i, '')) ||
                            safeName.toLowerCase().includes(r.roomName.toLowerCase().replace(/s$/i, ''))
                        );
                        
                        if (ratioData) {
                            const isFull = ratioData.currentKids >= ratioData.maxKids;
                            if (!isFull) {
                                // Automatically book on Google Calendar (No DB update per USER)
                                // Run async so we don't block the real-time AI response!
                                bookDropInOnCalendar("Unknown Parent", ratioData.roomName);
                                emitAction("calendar", "Drop-In Booked", `Room: ${ratioData.roomName}. Added to Google Calendar.`);
                            }
                            result = { 
                                status: "success", 
                                room: ratioData.roomName,
                                current_occupancy: ratioData.currentKids,
                                max_capacity: ratioData.maxKids,
                                is_full_legal_limit: isFull,
                                ratio: ratioData.ratioLimit
                            };
                        } else {
                            const available = allRatios.map(r => r.roomName);
                            result = { 
                                status: "not_found", 
                                requested_room: safeName,
                                valid_rooms: available
                            };
                        }
                    } catch (dbErr) {
                        console.error('[DB Error CheckRoomAvailability]', dbErr);
                        result = { result: "error", error: "Database lookup failed." };
                    }
                }

                // Send standardized snake_case tool response
                const toolResponse = {
                    tool_response: {
                        function_responses: [{
                            id: call.id,
                            name: call.name,
                            response: result
                        }]
                    }
                };
                gemWs.send(JSON.stringify(toolResponse));
                console.log(`[Gemini ToolResponse] Sent for ${call.name}`);
            }
        };
        executeTools();
    }
  });

  gemWs.on('error', (err) => console.error('[Gemini] Error:', err.message));

twWs.on('message', (message) => {
    const msg = JSON.parse(message);
    if (msg.event === 'start') {
      streamSid = msg.start.streamSid;
      console.log(`[Twilio] Stream Started: ${streamSid}`);
      emitCallStart();
      
      // Log Call to MongoDB
      const newCall = new Call({ streamSid, startTime: new Date() });
      newCall.save().catch(err => console.error('[MongoDB] Call Start Log Error:', err.message));
    } else if (msg.event === 'media') {
          // Decode 8kHz mu-law coming from Twilio -> 16kHz PCM for Gemini
          if (gemWs.readyState === WebSocket.OPEN && isSetupComplete) {
              const mBuffer = Buffer.from(msg.media.payload, 'base64');
              
              let wav = new WaveFile();
              wav.fromScratch(1, 8000, '8m', mBuffer);
              wav.fromMuLaw();
              wav.toSampleRate(16000);
              
              const pcmHeaderless = Buffer.from(wav.data.samples);
              const pcmBase64 = pcmHeaderless.toString('base64');
              
              const request = {
                realtimeInput: {
                  mediaChunks: [{
                    mimeType: "audio/pcm;rate=16000",
                    data: pcmBase64
                  }]
                }
              };
              gemWs.send(JSON.stringify(request));
          }
    } else if (msg.event === 'stop') {
      console.log('[Twilio] Stream Stopped');
      gemWs.close();
    }
  });

  twWs.on('close', async () => {
    console.log('[Twilio] Connection Closed');
    emitCallEnd();
    
    // Update Call record in MongoDB
    if (streamSid) {
      try {
        const endTime = new Date();
        const callRecord = await Call.findOne({ streamSid }).sort({ startTime: -1 });
        if (callRecord) {
          callRecord.endTime = endTime;
          callRecord.duration = Math.floor((endTime - callRecord.startTime) / 1000);
          await callRecord.save();
          console.log(`[MongoDB] Call record updated. Duration: ${callRecord.duration}s`);
        }
      } catch (err) {
        console.error('[MongoDB] Call End Update Error:', err.message);
      }
    }

    if (gemWs.readyState === WebSocket.OPEN) gemWs.close();
  });
});
