# Telehealth Command Center

Military-HUD dashboard for the Telehealth Cash Cow Machine.
Vite + React + TypeScript + Supabase + Recharts + Tailwind.

## Setup

```bash
cd command-center
cp .env.example .env
# paste VITE_SUPABASE_ANON_KEY into .env
npm install
npm run dev
```

Dev server: http://localhost:5173

## Lovable import

Push to GitHub, then in Lovable: **Import from GitHub** → select repo.
Lovable picks up Vite + Tailwind automatically. Add the same four
env vars in Lovable's project settings.

Target deploy domain: `dashboard.completefamilytelehealth.com`

## Auth

Single-user Supabase email/password auth. Create the user once in
Supabase Studio → Authentication → Users → Add user.

## Pages

1. `/` Dashboard — 8 stat cards, conversion funnel, daily perf, top domains
2. `/campaigns` — Domain table, niche table, email step rates
3. `/calls` — AVA call log (filters/pagination/export), RVM log, voice cost
4. `/email` — ReachInbox steps, per-contact timeline search, bounce tracker
5. `/chatbot` — Overview, top questions, conversation log, best opening
6. `/affiliate` — Click sources, allutional histogram, MRR projection
7. `/costs` — Per-service breakdown, Slybroadcast gauge, unit economics

## Data layout

Supabase client is configured against `schema: 'telehealth'`.
Tables consumed:
- `leads` — full row per lead with funnel state flags
- `conversions` — confirmed paying subscribers
- `daily_stats` — pre-aggregated daily counters
- `chatbot_sessions` — chat session log + JSONB transcript
- `domain_stats` — per-domain per-day rollup
- `cost_log` — every cost event with service/units/rate

## Build

```bash
npm run build      # type-check + production bundle
npm run preview    # preview production bundle locally
```
