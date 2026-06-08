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

The API route at `app/api/lessons/route.js` (GET / POST / PUT / DELETE) picks its
storage automatically:

- **Upstash Redis** when its credentials are present in the environment. This is
  what makes data persist on serverless hosts like Vercel.
- **`data/lessons.json`** (a plain local file) otherwise, so `npm run dev` works
  offline with no setup. Open that file any time to read or edit your log by hand.

## Deploying to Vercel

A serverless filesystem is read-only, so the local JSON file **cannot** persist
there — that's why lessons appeared not to save. Use a Redis store instead:

1. In the Vercel dashboard, open your project → **Storage** → **Create Database**
   → **Upstash → Redis** (free tier is fine). Connect it to the project.
2. Vercel injects the credentials as env vars automatically. The route reads either
   naming: `KV_REST_API_URL` / `KV_REST_API_TOKEN` or
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
3. Redeploy (pushing to the connected branch triggers this). Lessons now persist.

No code changes are needed — the route detects the credentials at runtime. Any
always-on Node server (VPS, Docker, `npm run start`) keeps using the JSON file.

## Structure

```
app/
  layout.jsx          fonts + html shell
  globals.css         responsive styles
  page.jsx            UI (client component, talks to the API)
  api/lessons/route.js   Redis in prod, data/lessons.json locally
data/lessons.json     your saved lessons (local dev only)
```
