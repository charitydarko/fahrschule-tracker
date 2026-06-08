"use client";

import { useEffect, useMemo, useState } from "react";

const COMPULSORY = {
  ueberland: { label: "Überland", en: "Overland drives", required: 5, color: "var(--green)" },
  autobahn: { label: "Autobahn", en: "Highway drives", required: 4, color: "var(--blue)" },
  nacht: { label: "Nachtfahrt", en: "Night drives", required: 3, color: "var(--violet)" },
};
const TYPE_ORDER = ["ueberland", "autobahn", "nacht", "practice"];
const TYPE_META = {
  ...COMPULSORY,
  practice: { label: "Übungsstunde", en: "Practice lesson", required: null, color: "var(--clay)" },
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};

export default function Page() {
  const [lessons, setLessons] = useState([]);
  const [status, setStatus] = useState("Loading…");
  const [form, setForm] = useState({ date: todayISO(), type: "ueberland", minutes: 45, cost: "", notes: "" });
  const [editingId, setEditingId] = useState(null);

  async function load() {
    try {
      const res = await fetch("/api/lessons", { cache: "no-store" });
      const data = await res.json();
      setLessons(data);
      setStatus("");
    } catch {
      setStatus("Could not load data.");
    }
  }
  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c = { ueberland: 0, autobahn: 0, nacht: 0, practice: 0 };
    let totalMin = 0;
    let totalCost = 0;
    lessons.forEach((l) => {
      c[l.type] = (c[l.type] || 0) + 1;
      totalMin += Number(l.minutes) || 0;
      totalCost += Number(l.cost) || 0;
    });
    return { c, totalMin, totalCost, total: lessons.length };
  }, [lessons]);

  const compulsoryDone =
    Math.min(counts.c.ueberland, 5) + Math.min(counts.c.autobahn, 4) + Math.min(counts.c.nacht, 3);
  const hours = (counts.totalMin / 60).toFixed(1);
  const spend = "€" + Math.round(counts.totalCost).toLocaleString("de-DE");

  const sorted = useMemo(
    () => [...lessons].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [lessons]
  );

  function resetForm() {
    setForm({ date: todayISO(), type: "ueberland", minutes: 45, cost: "", notes: "" });
    setEditingId(null);
  }

  async function submit() {
    if (!form.date) return;
    setStatus("Saving…");
    const payload = { ...form, minutes: Number(form.minutes) || 0, cost: Number(form.cost) || 0 };
    if (editingId) {
      await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...payload }),
      });
    } else {
      await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    resetForm();
    await load();
  }

  function editLesson(l) {
    setForm({ date: l.date, type: l.type, minutes: l.minutes, cost: l.cost ?? "", notes: l.notes || "" });
    setEditingId(l.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function delLesson(id) {
    setStatus("Deleting…");
    await fetch(`/api/lessons?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    await load();
  }

  return (
    <main className="wrap">
      <div className="kicker">FAHRSCHULE · KLASSE B</div>
      <h1>Driving Lesson Tracker</h1>
      <p className="sub">
        12 special lessons (Sonderfahrten) are mandatory. Everything else is your own record to
        reconcile against your instructor&apos;s notes. Saved to a file on the server.
      </p>

      <div className="stats">
        <div className="stat">
          <div className="val" style={{ color: "var(--green)" }}>
            {compulsoryDone}/12
          </div>
          <div className="lbl">Compulsory done</div>
        </div>
        <div className="stat">
          <div className="val" style={{ color: "var(--blue)" }}>
            {counts.total}
          </div>
          <div className="lbl">Total lessons</div>
        </div>
        <div className="stat">
          <div className="val" style={{ color: "var(--clay)" }}>
            {hours}
            <span style={{ fontSize: "0.55em" }}>h</span>
          </div>
          <div className="lbl">Total hours</div>
        </div>
        <div className="stat">
          <div className="val" style={{ color: "var(--violet)" }}>
            {spend}
          </div>
          <div className="lbl">Total spend</div>
        </div>
      </div>

      <h2>Mandatory special lessons</h2>
      <div className="comp-grid">
        {Object.entries(COMPULSORY).map(([key, m]) => {
          const done = counts.c[key];
          const pct = Math.min(100, (done / m.required) * 100);
          const complete = done >= m.required;
          return (
            <div className="comp" key={key}>
              <div className="comp-top">
                <div>
                  <div className="comp-label" style={{ color: m.color }}>
                    {m.label}
                  </div>
                  <div className="comp-en">{m.en} · 45 min each</div>
                </div>
                <div className="comp-count">
                  <span style={{ color: m.color }}>{Math.min(done, m.required)}</span>
                  <span className="req">/{m.required}</span>
                  {complete && <span className="check">✓</span>}
                </div>
              </div>
              <div className="bar">
                <span style={{ width: `${pct}%`, background: m.color }} />
              </div>
              {done > m.required && <div className="over">+{done - m.required} extra logged</div>}
            </div>
          );
        })}
      </div>

      <h2>{editingId ? "Edit lesson" : "Log a lesson"}</h2>
      <div className="form">
        <div className="field">
          <label>Date</label>
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Type</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {TYPE_META[t].label} — {TYPE_META[t].en}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Minutes</label>
          <div className="min-row">
            {[45, 90, 135].map((mn) => (
              <button
                key={mn}
                className={"chip" + (Number(form.minutes) === mn ? " on" : "")}
                onClick={() => setForm({ ...form, minutes: mn })}
              >
                {mn}
              </button>
            ))}
            <span className="custom-min">
              <span>custom</span>
              <input
                className="input"
                type="number"
                value={form.minutes}
                onChange={(e) => setForm({ ...form, minutes: e.target.value })}
              />
            </span>
          </div>
        </div>
        <div className="field">
          <label>Cost (€) — optional</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 75"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Notes (optional)</label>
          <input
            className="input"
            type="text"
            placeholder="e.g. parking, roundabouts, instructor: more highway"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <div className="form-btns">
          <button className="primary" onClick={submit}>
            {editingId ? "Save changes" : "+ Add lesson"}
          </button>
          {editingId && (
            <button className="ghost" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <h2>
        Your log <span className="log-count">({lessons.length})</span>
      </h2>
      {status && <div className="state">{status}</div>}
      {!status && sorted.length === 0 ? (
        <div className="empty">
          No lessons yet. Ask your instructor for his running totals and enter each lesson above —
          start with the special lessons so the 12 mandatory ones stay accurate.
        </div>
      ) : (
        <div className="log">
          {sorted.map((l) => {
            const m = TYPE_META[l.type] || TYPE_META.practice;
            return (
              <div className="log-item" key={l.id}>
                <span className="dot" style={{ background: m.color }} />
                <div className="log-main">
                  <div className="log-top">
                    <span className="log-type">{m.label}</span>
                    <span className="log-date">{fmtDate(l.date)}</span>
                  </div>
                  {l.notes && <div className="log-notes">{l.notes}</div>}
                </div>
                <span className="log-min">
                  {l.minutes}&prime;
                  {Number(l.cost) > 0 && <> · €{l.cost}</>}
                </span>
                <div className="log-actions">
                  <button className="icon-btn" onClick={() => editLesson(l)} title="Edit">
                    ✎
                  </button>
                  <button className="icon-btn" onClick={() => delLesson(l.id)} title="Delete">
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="footer">
        Saved to <code>data/lessons.json</code> on the server. {counts.total} lessons ·{" "}
        {counts.totalMin} min ({hours} h) · {spend} total · {counts.c.practice} practice lesson
        {counts.c.practice === 1 ? "" : "s"}.
      </div>
    </main>
  );
}
