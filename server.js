require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const Pusher = require('pusher');
const { WaveFile } = require('wavefile');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
        parts: [{ text: "You are Fawn, an AI receptionist for Sunshine Daycare. You must answer calls, help parents book tours, and generate intake forms. Keep responses extremely brief and conversational! Ask one question at a time. Use tools when appropriate." }]
      },
      tools: [{
        function_declarations: [
          {
            name: "BookCalendar",
            description: "Books a daycare tour on the calendar.",
            parameters: {
              type: "OBJECT",
              properties: {
                date_time: { type: "STRING", description: "The date and time of the tour" },
                name: { type: "STRING", description: "Parent's name" }
              },
              required: ["date_time", "name"]
            }
          },
          {
            name: "GenerateDoc",
            description: "Generates an intake form document for a child.",
            parameters: {
              type: "OBJECT",
              properties: {
                child_name: { type: "STRING" },
                age: { type: "STRING" },
                medical_notes: { type: "STRING" }
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
        msg.toolCall.functionCalls.forEach(call => {
            console.log(`[Gemini ToolCall] ${call.name}`, call.args);
            
            if (call.name === "BookCalendar") {
                emitAction("calendar", "Tour Booked", `Parent: ${call.args.name}, Time: ${call.args.date_time}`);
            } else if (call.name === "GenerateDoc") {
                emitAction("document", "Generating Intake Form", `Child: ${call.args.child_name}, Age: ${call.args.age}. Med: ${call.args.medical_notes || 'None'}`);
            }

            // Simulate instant success response back to Gemini WS
            setTimeout(() => {
                const response = {
                    toolResponse: {
                        functionResponses: [{
                            id: call.id,
                            name: call.name,
                            response: { result: "success" }
                        }]
                    }
                };
                gemWs.send(JSON.stringify(response));
            }, 500);
        });
    }
  });

  gemWs.on('error', (err) => console.error('[Gemini] Error:', err.message));

twWs.on('message', (message) => {
    const msg = JSON.parse(message);
    if (msg.event === 'start') {
      streamSid = msg.start.streamSid;
      console.log(`[Twilio] Stream Started: ${streamSid}`);
      emitCallStart();
    } else if (msg.event === 'media') {
      // Decode 8kHz mu-law coming from Twilio -> 16kHz PCM for Gemini
      if (gemWs.readyState === WebSocket.OPEN) {
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

  twWs.on('close', () => {
    console.log('[Twilio] Connection Closed');
    emitCallEnd();
    if (gemWs.readyState === WebSocket.OPEN) gemWs.close();
  });
});
