# 🦌 Fawn AI — Daycare Receptionist Agent

Fawn is an AI-powered phone receptionist for daycare centers. She answers calls autonomously via Twilio, speaks with parents using Google's Gemini 2.5 Native Audio, books tours, and generates intake forms — all while syncing live to a Director's Dashboard.

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, Framer Motion, Lucide React
- **Backend:** Node.js, Express, WebSockets (`ws`)
- **AI Voice:** Gemini 2.5 Flash Native Audio (Live API)
- **Phone:** Twilio Media Streams
- **Realtime Sync:** Pusher Channels
- **Tunnel:** ngrok

## Quick Start

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd fawnai
npm install
```

### 2. Set Up API Keys
```bash
cp .env.example .env
```
Then open `.env` and fill in your keys:
- **GEMINI_API_KEY** — Get from [Google AI Studio](https://aistudio.google.com/) → "Get API key" → "Create API key in new project"
- **PUSHER_*** — Create a free app at [Pusher.com](https://pusher.com/) → Channels → App Keys
- **TWILIO_*** — From your [Twilio Console](https://console.twilio.com/) dashboard

### 3. Set Up ngrok
```bash
npx ngrok config add-authtoken <YOUR_NGROK_TOKEN>
```
Get your token from [ngrok.com/dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)

### 4. Run Everything
```bash
npm run dev:all
```
This launches three services at once:
| Service | Port | Description |
|---------|------|-------------|
| Next.js Dashboard | `3000` | Director's Cockpit UI |
| Node.js Server | `8080` | Twilio ↔ Gemini audio bridge |
| ngrok | auto | Public tunnel to port 8080 |

### 5. Configure Twilio
1. Find your ngrok URL in the terminal (or visit `http://localhost:4040`)
2. Go to Twilio → Phone Numbers → Your Number → Voice Config
3. Set **"A CALL COMES IN"** webhook to: `https://<your-ngrok-url>/api/voice/inbound` (HTTP POST)
4. Save and call your Twilio number!

> **Trial Account Note:** Twilio will say "Press any key to execute your code." You MUST press a digit on your keypad or it will hang up.

## Project Structure
```
fawnai/
├── server.js                    # Twilio ↔ Gemini audio bridge + Pusher events
├── src/
│   ├── app/
│   │   ├── page.tsx             # Main Dashboard (Pusher listener + Simulate button)
│   │   ├── layout.tsx           # Root layout
│   │   └── globals.css          # Global styles
│   └── components/
│       └── dashboard/
│           ├── MetricsHeader.tsx       # Leads & Calls counters
│           ├── LiveAgentPanel.tsx      # Live transcript + thinking indicator
│           └── AutonomousActionsFeed.tsx # Tool-use action cards timeline
├── .env.example                 # Template for API keys
├── tailwind.config.ts           # Daycare theme colors
└── package.json                 # Scripts including dev:all
```

## Dashboard Demo Mode
Click the **"Simulate Call"** button on the dashboard to run a scripted demo without needing any API keys or phone calls.
