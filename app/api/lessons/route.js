import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Run on the Node runtime so we can touch the filesystem locally, and never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Storage
//
// On a serverless host (Vercel, Netlify) the project filesystem is read-only,
// so we CANNOT persist to a JSON file there — writes throw and data vanishes.
// When Upstash Redis credentials are present (set automatically by Vercel's
// Storage → Upstash Redis integration) we use that. Otherwise we fall back to
// a local JSON file so `npm run dev` keeps working offline.
// ---------------------------------------------------------------------------

const REDIS_KEY = "lessons";
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "lessons.json");

async function readLessons() {
  if (redis) {
    const data = await redis.get(REDIS_KEY);
    // @upstash/redis already parses JSON; guard against legacy string values.
    if (Array.isArray(data)) return data;
    if (typeof data === "string") {
      try {
        return JSON.parse(data || "[]");
      } catch {
        return [];
      }
    }
    return [];
  }
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

async function writeLessons(lessons) {
  if (redis) {
    await redis.set(REDIS_KEY, lessons);
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(lessons, null, 2), "utf8");
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// GET /api/lessons -> all lessons
// GET /api/lessons?diag=1 -> storage diagnostics (no secrets leaked)
export async function GET(req) {
  const diag = new URL(req.url).searchParams.get("diag");
  if (diag) {
    const env = {
      KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
      KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
      UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
      UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    };
    let redisPing = null;
    let error = null;
    if (redis) {
      try {
        redisPing = await redis.ping();
      } catch (e) {
        error = String(e?.message || e);
      }
    }
    return NextResponse.json({
      storage: redis ? "redis" : "file",
      redisConfigured: Boolean(redis),
      env,
      redisPing,
      error,
    });
  }
  try {
    return NextResponse.json(await readLessons());
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

// Serverless filesystems are read-only, so a file write throws EROFS. Turn that
// (and any storage failure) into a clear message instead of an opaque 500.
function storageError(e) {
  const msg = String(e?.message || e);
  const isReadOnly = /EROFS|read-only|ENOENT/i.test(msg);
  return NextResponse.json(
    {
      error: isReadOnly && !redis
        ? "Storage is read-only. On Vercel/Netlify you must connect an Upstash Redis store (Storage tab) and redeploy — file storage can't persist there."
        : "Could not save lesson.",
      detail: msg,
      storage: redis ? "redis" : "file",
    },
    { status: 500 }
  );
}

// POST /api/lessons -> add a lesson
export async function POST(req) {
  try {
    const body = await req.json();
    const lessons = await readLessons();
    const entry = {
      id: newId(),
      date: body.date,
      type: body.type,
      minutes: Number(body.minutes) || 0,
      cost: Number(body.cost) || 0,
      notes: body.notes || "",
    };
    lessons.push(entry);
    await writeLessons(lessons);
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    return storageError(e);
  }
}

// PUT /api/lessons -> update a lesson (body must include id)
export async function PUT(req) {
  try {
    const body = await req.json();
    const lessons = await readLessons();
    const idx = lessons.findIndex((l) => l.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
    lessons[idx] = {
      ...lessons[idx],
      date: body.date ?? lessons[idx].date,
      type: body.type ?? lessons[idx].type,
      minutes: body.minutes != null ? Number(body.minutes) : lessons[idx].minutes,
      cost: body.cost != null ? Number(body.cost) : lessons[idx].cost,
      notes: body.notes ?? lessons[idx].notes,
    };
    await writeLessons(lessons);
    return NextResponse.json(lessons[idx]);
  } catch (e) {
    return storageError(e);
  }
}

// DELETE /api/lessons?id=xyz -> remove a lesson
export async function DELETE(req) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    const lessons = await readLessons();
    const next = lessons.filter((l) => l.id !== id);
    await writeLessons(next);
    return NextResponse.json({ ok: true, removed: lessons.length - next.length });
  } catch (e) {
    return storageError(e);
  }
}
