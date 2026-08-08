# Diamond Tracker

A mobile-first Progressive Web App for solo entrepreneurs to log daily business activities and manage a unified prospect/customer list. Installable to an Android home screen, works on desktop browsers, and syncs in real time across devices under one account.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS (dark theme)
- **Backend:** Supabase (Postgres + Auth + Realtime)
- **AI:** GitHub Models API (via Vercel Serverless Functions)
- **PWA:** vite-plugin-pwa (installable, offline app shell)
- **Deploy:** Vercel (free tier)

## Features

- **Dashboard:** Weekly stat cards, calendar heatmap, daily streak counter, 7-day activity mix chart
- **Daily Check-in:** Association logging, monthly Ditto card, accountability checklist with editable template
- **Content:** Reading/podcast logging with voice input, AI-polished WhatsApp summaries, share to WhatsApp
- **Network:** Unified prospect/customer list with 3-way category picker, contact import, DTM tracking, inventory
- **Coach:** Session logging with voice input, AI action-item extraction, tickable checklist

## Prerequisites

1. A [Supabase](https://supabase.com) account (free tier)
2. A [GitHub](https://github.com) account (for GitHub Models API token)
3. A [Vercel](https://vercel.com) account (free tier)
4. Node.js 18+

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd diamond-tracker
npm install
```

### 2. Configure Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier)
2. Once created, go to **SQL Editor** → **New Query**
3. Copy and paste the contents of [`supabase/migration.sql`](./supabase/migration.sql) and click **Run**
4. This creates all 9 tables with Row Level Security policies and enables realtime

### 3. Get Supabase Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy the **Project URL** and **anon public key**

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Supabase (client-side — safe to expose)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# GitHub Models API token (server-side only — NEVER expose to client)
GITHUB_TOKEN=ghp_your_github_personal_access_token
```

### 5. Generate a GitHub Personal Access Token (for AI features)

GitHub Models provides free access to LLMs (including Llama 3.1 8B Instruct) through your GitHub account.

1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** (or classic tokens)
2. Click **Generate new token**
3. For the **Models** scope:
   - If using a fine-grained token, no specific repository access is needed — the token just needs the Models scope
   - If using a classic token, select the `repo` scope (GitHub Models currently works with any valid token)
4. Copy the token (starts with `ghp_`)
5. Set this as `GITHUB_TOKEN` in your environment variables

> **Note:** The GitHub Models API is used server-side only. The token is stored as a Vercel environment variable and never sent to the browser. All AI calls go through the `/api/polish-content` and `/api/extract-actions` serverless functions.

> **Alternative models:** If `meta-llama-3.1-8b-instruct` is unavailable, you can change the `MODEL` constant in `api/polish-content.ts` and `api/extract-actions.ts` to any model available on [GitHub Models](https://github.com/marketplace/models) (e.g., `gpt-4o-mini`, `Phi-3.5-mini-instruct`).

### 6. Run Locally

```bash
npm run dev
```

The app runs at `http://localhost:5173`. Open it in Chrome for full PWA and voice input support.

### 7. Type Check

```bash
npm run typecheck
```

## Deploy to Vercel

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and click **New Project**
3. Import your GitHub repository
4. Vercel auto-detects Vite — verify these settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
   - `GITHUB_TOKEN` — your GitHub Models token (server-side only)
6. Click **Deploy**

The `/api/*` serverless functions are automatically detected from the `api/` directory and the `vercel.json` configuration.

## Install as PWA

### Android (Chrome)
1. Open the deployed URL in Chrome
2. Tap the menu (⋮) → **Install app** (or **Add to Home screen**)
3. The app appears on your home screen and opens in standalone mode

### Desktop (Chrome/Edge)
1. Open the deployed URL
2. Click the **Install** icon in the address bar
3. The app installs as a desktop application

## Platform Limitations

| Feature | Supported | Fallback |
|---------|-----------|----------|
| Voice input (Web Speech API) | Chrome (desktop + Android) | Mic button disabled with tooltip; type manually |
| Contact import (Contact Picker API) | Chrome on Android only | Manual add form with inline message |
| WhatsApp share | All browsers | Opens WhatsApp with pre-filled text — user picks recipient and sends manually |
| AI polish/extract | Requires internet | Cached results shown; new requests queued and auto-retried when online |

## Architecture

```
diamond-tracker/
├── api/                        # Vercel Serverless Functions
│   ├── polish-content.ts       # AI content polishing (GitHub Models)
│   └── extract-actions.ts      # AI action item extraction (GitHub Models)
├── public/                     # Static assets
│   └── icon.svg                # App icon
├── src/
│   ├── components/              # React components
│   │   ├── ui/                  # Base UI kit (Button, Card, Input, etc.)
│   │   ├── Navigation.tsx      # Bottom nav (mobile) + top nav (desktop)
│   │   ├── MicButton.tsx       # Web Speech API mic button
│   │   ├── Heatmap.tsx         # Calendar heatmap with day detail modal
│   │   ├── BarChart.tsx        # 7-day activity mix chart
│   │   └── StatCard.tsx        # Dashboard stat cards
│   ├── hooks/                   # React hooks
│   │   ├── useAuth.tsx         # Supabase auth context
│   │   ├── useData.tsx         # Supabase CRUD + realtime data context
│   │   ├── useMic.ts           # Web Speech API wrapper
│   │   └── useOnlineStatus.ts # Online/offline detection + queue processing
│   ├── lib/                     # Core logic
│   │   ├── supabase.ts         # Supabase client
│   │   ├── ai.ts               # AI client with IndexedDB caching + offline queue
│   │   ├── db.ts               # IndexedDB wrapper for cache + queue
│   │   └── utils.ts            # Date helpers, formatters
│   ├── pages/                   # App screens
│   │   ├── Dashboard.tsx       # Home / overview
│   │   ├── DailyCheckin.tsx    # Association + Ditto + Accountability
│   │   ├── Content.tsx         # Reading & podcast logging
│   │   ├── Network.tsx         # Prospects & customers
│   │   ├── Coach.tsx           # Coaching sessions + action items
│   │   ├── AuthScreen.tsx      # Sign in / sign up
│   │   └── SetupScreen.tsx    # Pre-configuration instructions
│   ├── types/database.ts        # TypeScript types matching Supabase schema
│   ├── App.tsx                  # App shell with routing + providers
│   ├── main.tsx                 # React entry point
│   └── index.css               # Design system + Tailwind
├── supabase/
│   └── migration.sql           # Database schema + RLS policies
├── index.html
├── vite.config.ts              # Vite + PWA config
├── tailwind.config.ts          # Dark theme colors + fonts
├── vercel.json                 # Vercel routing + serverless config
├── .env.example
└── package.json
```

## Design System

- **Theme:** Dark only
- **Background:** `#12151A` | **Surface:** `#191D24` | **Border:** `#2B303B`
- **Text:** `#EDEEF0` | **Muted:** `#8B93A1`
- **Accent (amber):** `#E8A33D`
- **Customer/Success (sage):** `#6FA88A` | **Prospect/Warning (clay):** `#D9764A`
- **Danger:** `#D9534F`
- **Fonts:** Sora (headings), Inter (body), JetBrains Mono (dates/labels/numbers)
- **Cards:** 14px border radius | **Buttons/Chips:** pill-shaped

## Offline AI Resilience

- Successful AI responses are cached in IndexedDB, keyed by a hash of the input text
- If a new AI request is made while offline, it's queued in IndexedDB
- When the browser comes back online, queued requests are automatically retried
- Inline status badges: "Polished (cached)", "Extraction queued — will retry when online"

## Security

- All Supabase tables use Row Level Security (RLS) — only the authenticated owner can read/write their rows
- The GitHub Models API token (`GITHUB_TOKEN`) is stored as a server-side environment variable and never sent to the browser
- Supabase anon key is safe to expose in client-side code — it only works with RLS policies

## Privacy & Audio

The Web Speech API used for voice input transcribes audio in real-time and sends it to the browser's speech recognition service. **No audio is stored** — only the transcribed text is saved to Supabase. The 7-day audio auto-deletion concern is therefore not applicable: there is no audio to delete.

## License

Private — for personal use.
