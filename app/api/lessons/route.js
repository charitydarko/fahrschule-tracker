import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

// Run on the Node runtime so we can touch the filesystem, and never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "lessons.json");

async function readLessons() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

async function writeLessons(lessons) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(lessons, null, 2), "utf8");
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// GET /api/lessons -> all lessons
export async function GET() {
  return NextResponse.json(await readLessons());
}

// POST /api/lessons -> add a lesson
export async function POST(req) {
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
}

// PUT /api/lessons -> update a lesson (body must include id)
export async function PUT(req) {
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
}

// DELETE /api/lessons?id=xyz -> remove a lesson
export async function DELETE(req) {
  const id = new URL(req.url).searchParams.get("id");
  const lessons = await readLessons();
  const next = lessons.filter((l) => l.id !== id);
  await writeLessons(next);
  return NextResponse.json({ ok: true, removed: lessons.length - next.length });
}
