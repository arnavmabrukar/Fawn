# 🦌 Fawn AI — Daycare Receptionist Agent

<img width="241" height="72" alt="image" src="https://github.com/user-attachments/assets/caee2319-47f2-4a0b-a484-cfb672d9753e" />

https://youtu.be/KsoXxblur1Y 

Fawn is an AI-powered phone receptionist for daycare centers. She answers calls autonomously via Twilio, speaks with parents using Google's Gemini Native Audio, books tours, and generates intake forms — all while syncing live to a Director's Dashboard. Features include real-time parent check-ins, autonomous action feeds, and integrated AI agent workflows.

## Tech Stack

- **Frontend:** Next.js 14, Tailwind CSS, Framer Motion, Lucide React
- **Backend:** Node.js, Express, WebSockets (`ws`)
- **Database:** MongoDB (Leads, Calls, Toy Feedback, Room Ratios)
- **AI Voice:** Gemini 1.5 Flash Native Audio (Live API)
- **Document Generation:** Gemini 1.5 Flash (Intake documents, Medical notes)
- **Phone:** Twilio Media Streams
- **Realtime Sync:** Pusher Channels
- **Google Integration:** Sheets (lead tracking), Calendar (scheduling)
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
- **MONGODB_URI** — MongoDB connection string (local or cloud)
- **GOOGLE_APPLICATION_CREDENTIALS** — Path to Google service account JSON file

### 3. Set Up Google Service Account
```bash
cp google-service-account.example.json google-service-account.json
```
Add your Google Cloud service account credentials for Sheets & Calendar access.

### 4. Set Up ngrok
```bash
npx ngrok config add-authtoken <YOUR_NGROK_TOKEN>
```
Get your token from [ngrok.com/dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)

### 5. Run Everything
```bash
npm run dev:all
```
This launches three services at once:
| Service | Port | Description |
|---------|------|-------------|
| Next.js Dashboard | `3000` | Login & Multi-page UI (Admin, Client, AI Agent) |
| Node.js Server | `8080` | Twilio ↔ Gemini audio bridge + API endpoints |
| ngrok | auto | Public tunnel to port 8080 |

### 6. Configure Twilio
1. Find your ngrok URL in the terminal (or visit `http://localhost:4040`)
2. Go to Twilio → Phone Numbers → Your Number → Voice Config
3. Set **"A CALL COMES IN"** webhook to: `https://<your-ngrok-url>/api/voice/inbound` (HTTP POST)
4. Save and call your Twilio number!

> **Trial Account Note:** Twilio will say "Press any key to execute your code." You MUST press a digit on your keypad or it will hang up.

## Project Structure
```
fawnai/
├── server.js                          # Twilio ↔ Gemini bridge + API endpoints
├── db.js                              # MongoDB models & connection
├── src/
│   ├── app/
│   │   ├── page.tsx                   # Login page
│   │   ├── admin/
│   │   │   └── page.tsx               # Admin Dashboard (leads, intake docs)
│   │   ├── client/
│   │   │   └── page.tsx               # Client view (audit log, check-ins)
│   │   ├── ai-agent/
│   │   │   └── page.tsx               # AI agent swarm interface
│   │   ├── api/feed/action/
│   │   │   └── route.ts               # Feed action endpoint
│   │   ├── layout.tsx                 # Root layout
│   │   └── globals.css                # Global styles
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx     # Lead management dashboard
│   │   │   └── DigitalIntakeDoc.tsx   # PDF intake form generator
│   │   ├── client/
│   │   │   ├── ClientAuditLog.tsx     # Activity log viewer
│   │   │   └── ClientCheckInCard.tsx  # Parent check-in interface
│   │   └── dashboard/
│   │       ├── MetricsHeader.tsx      # Leads & Calls counters
│   │       ├── LiveAgentPanel.tsx     # Live transcript + thinking
│   │       ├── AutonomousActionsFeed.tsx # Action cards timeline
│   │       ├── AdminNoteComposer.tsx  # Note editor
│   │       ├── HistoryModal.tsx       # Call/action history modal
│   │       └── IntakeSummaryModal.tsx # Intake form modal
│   └── lib/
│       ├── live-feed.ts               # Feed utilities & types
│       └── pdf/
│           └── digitalIntakePdf.ts    # PDF generation
├── .env.example                       # Template for API keys
├── tailwind.config.ts                 # Daycare theme colors
├── package.json                       # Dependencies & scripts
└── README.md                          # This file
```

## Key Features

### Director Dashboard (Admin)
- Real-time lead management
- Live agent transcript monitoring
- Action feed of autonomous operations (tours booked, documents generated, etc.)
- Metrics header showing calls and leads

### Client Portal
- Parent check-in interface
- Audit log of all actions and updates
- Family communication history

### AI Agent Interface
- Swarm agent coordination view
- Toy feedback and ratings system
- Multi-agent performance tracking

## API Endpoints

- `POST /api/voice/inbound` — Twilio webhook for incoming calls
- `POST /api/feed/action` — Log autonomous actions to feed
- `GET /api/history` — Retrieve call and lead history
- `GET /api/toys` — Get toy feedback records
- `GET /api/swarm` — Get AI agent status and results
- `POST /api/check-in` — Record parent check-in

## Database Models

- **Lead** — Parent/family inquiry data
- **Call** — Voice call metadata and transcripts
- **ToyFeedback** — Teacher ratings and feedback
- **RoomRatio** — Classroom capacity and staffing ratios
