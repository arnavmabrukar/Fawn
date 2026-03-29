require('dotenv').config();
const { google } = require('googleapis');

const googleAuth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar'
  ],
});
const calendar = google.calendar({ version: 'v3', auth: googleAuth });

async function test() {
  try {
    const timeMin = new Date().toISOString();
    console.log(`Checking calendar: ${process.env.GOOGLE_CALENDAR_ID}`);
    const res = await calendar.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        timeMin: timeMin,
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    });
    console.log("SUCCESS! Could access calendar.");
    
    // Now try to insert
    const soon = new Date(Date.now() + 60 * 60000); // 1 hour
    const event = {
        summary: `Test Drop-In from Script`,
        start: { dateTime: soon.toISOString() },
        end: { dateTime: new Date(soon.getTime() + 30 * 60000).toISOString() }
    };
    
    await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        resource: event,
    });
    console.log("SUCCESS! Inserted an event.");
  } catch (err) {
    console.error("FAIL:", err.message);
  }
}

test();
