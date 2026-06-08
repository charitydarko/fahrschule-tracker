# Fahrschule Tracker

A minimal Next.js app to track German Class B driving lessons. Compulsory special
lessons (Sonderfahrten): **5 Überland, 4 Autobahn, 3 Nachtfahrt** = 12 total.
Practice lessons (Übungsstunden) are uncapped and just add to your total hours.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Where data is saved

Every entry is written to a plain JSON file: **`data/lessons.json`**, via the API
route at `app/api/lessons/route.js` (GET / POST / PUT / DELETE). Open that file any
time to read or edit your log by hand — it's just text.

## Deploying note

File-based storage works on your own machine or any always-on Node server (a VPS,
Docker, `npm run start`, etc.). On serverless hosts (Vercel, Netlify) the filesystem
is read-only / ephemeral, so the JSON file won't persist there — swap the read/write
helpers in `route.js` for SQLite, Postgres, or a KV store when you deploy that way.

## Structure

```
app/
  layout.jsx          fonts + html shell
  globals.css         responsive styles
  page.jsx            UI (client component, talks to the API)
  api/lessons/route.js   reads/writes data/lessons.json
data/lessons.json     your saved lessons
```
