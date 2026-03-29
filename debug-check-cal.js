require('dotenv').config();
const { google } = require('googleapis');

const googleAuth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/calendar'],
});
const calendar = google.calendar({ version: 'v3', auth: googleAuth });

async function checkEvents() {
    const timeMin = new Date(Date.now() - 24 * 60 * 60000).toISOString();
    try {
        const res = await calendar.events.list({
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            timeMin,
            maxResults: 20,
            singleEvents: true,
            orderBy: 'startTime',
        });
        console.log("Recent Events:", res.data.items.map(e => ({
            summary: e.summary,
            start: e.start.dateTime,
        })));
    } catch(err) {
        console.error(err);
    }
}
checkEvents();
