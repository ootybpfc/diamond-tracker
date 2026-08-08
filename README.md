# Diamond Tracker

A mobile-first Progressive Web App for solo entrepreneurs to log daily business activities and manage a unified prospect/customer list. Installable to an Android home screen, works on desktop browsers, and syncs in real time across devices under one account.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS (dark theme)
- **Backend:** Supabase (Postgres + Auth + Realtime)
- **AI:** Google Gemini API (via Vercel Serverless Functions)
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
2. A [Google AI Studio](https://aistudio.google.com/apikey) account (for a Gemini API key)
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

> If you already have an existing Supabase project and are upgrading from an older schema, run the safe migration script instead:
>
> ```sql
> -- supabase/upgrade-dtm-count-2026-08-08.sql
> alter table public.accountability_days
>   add column if not exists dtm_count integer not null default 0;
> ```
>
> Also run `supabase/upgrade-rls-update-check-2026-08-08.sql`. It adds a
> `WITH CHECK (auth.uid() = user_id)` clause to every UPDATE policy so a row
> cannot be reassigned to a different `user_id` during an update.
>
> And run `supabase/upgrade-revoke-rls-auto-enable-2026-08-08.sql`. It revokes
> `anon`/`authenticated` EXECUTE on the `SECURITY DEFINER` helper
> `public.rls_auto_enable()`, which was otherwise callable by anyone at
> `/rest/v1/rpc/rls_auto_enable`. The `ensure_rls` event trigger keeps working.

### Auth hardening

Enable **Prevent use of leaked passwords** under Authentication → Sign In /
Providers → Email. It checks new passwords against HaveIBeenPwned. Note this
setting requires a Supabase **Pro** plan; on the Free tier the dashboard will
accept the toggle but the API rejects the save with HTTP 402.

### 3. Get Supabase Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy the **Project URL** and **anon public key**

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Supabase (client-side — safe to expose)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Gemini API key (server-side only — NEVER expose to client)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL_NAME=gemini-1.5-flash
```

### 5. Generate a Gemini API Key (for AI features)

Google AI Studio provides a free-tier API key for the Gemini models.

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and sign in with a Google account
2. Click **Create API key**
3. Copy the generated key (starts with `AIza`)
4. Set this as `GEMINI_API_KEY` in your environment variables

> **Note:** The Gemini API is called server-side only, via the `generateContent` REST endpoint. The key is stored as a Vercel environment variable and never sent to the browser. All AI calls go through the `/api/polish-content` and `/api/extract-actions` serverless functions.

> **AI Provider:** These functions call the [Google Generative Language API](https://ai.google.dev/gemini-api/docs) (Gemini), replacing the previously used GitHub Models service (retired 2026-07-30). Configuration is env-var driven so the provider/model can change without a code change:
> - `GEMINI_API_KEY` — your Gemini API key (required).
> - `GEMINI_MODEL_NAME` — model name to call. Defaults to `gemini-1.5-flash` if unset.
> - `AI_ENDPOINT_URL` — optional full override of the `generateContent` request URL, if you need to point at a different endpoint (e.g. a regional or Vertex AI endpoint). Defaults to `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`.
>
> Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL_NAME`) on Vercel and in your local `.env`.

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
   - `GEMINI_API_KEY` — your Gemini API key (server-side only)
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
│   ├── polish-content.ts       # AI content polishing (Gemini)
│   └── extract-actions.ts      # AI action item extraction (Gemini)
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
│   ├── migration.sql           # Database schema + RLS policies
│   ├── upgrade-dtm-count-2026-08-08.sql  # Safe upgrade for existing projects
│   ├── upgrade-rls-update-check-2026-08-08.sql  # Adds WITH CHECK to UPDATE policies
│   └── upgrade-revoke-rls-auto-enable-2026-08-08.sql  # Unexposes definer helper from REST
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
- The Gemini API key (`GEMINI_API_KEY`) is stored as a server-side environment variable and never sent to the browser
- Supabase anon key is safe to expose in client-side code — it only works with RLS policies

## Privacy & Audio

The Web Speech API used for voice input transcribes audio in real-time and sends it to the browser's speech recognition service. **No audio is stored** — only the transcribed text is saved to Supabase. The 7-day audio auto-deletion concern is therefore not applicable: there is no audio to delete.

## License

Private — for personal use.
