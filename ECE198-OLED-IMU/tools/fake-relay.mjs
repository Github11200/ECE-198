#!/usr/bin/env node
// Simulates the laptop relay (backend/wearable/publish_feedback.py) so the
// wearable can be tested without the camera tracker. Publishes a session for
// P01 to the Convex /feedback HTTP route once per second, with reps climbing
// and the cue changing, then publishes "no session" on exit (Ctrl+C).
//
// Usage (from the repo root, reads CONVEX_SITE_URL + FEEDBACK_PUBLISH_TOKEN
// from .env.local / .env):
//   node ECE198-OLED-IMU/tools/fake-relay.mjs [seconds=30] [participant=P01]

import { readFileSync } from "node:fs";

function envFile(path) {
  try {
    return Object.fromEntries(readFileSync(path, "utf8").split("\n")
      .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
  } catch { return {}; }
}
const env = { ...envFile(".env"), ...envFile(".env.local"), ...process.env };
const site = env.CONVEX_SITE_URL, token = env.FEEDBACK_PUBLISH_TOKEN;
if (!site || !token) throw new Error("Need CONVEX_SITE_URL and FEEDBACK_PUBLISH_TOKEN (.env.local/.env)");

const seconds = Number(process.argv[2] ?? 30), who = process.argv[3] ?? "P01";
const target = 8, sessionId = `fake-${Date.now()}`;
const cues = [["READY", "Ready"], ["RANGE_OK", "Range reached"], ["CHECK_RANGE", "Check range"]];

async function publish(session, dashboard = null) {
  const res = await fetch(`${site}/feedback`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ session, dashboard }),
  });
  if (!res.ok) throw new Error(`publish failed: ${res.status} ${await res.text()}`);
}

function snapshot(tick) {
  const reps = Math.min(Math.floor(tick / 3), target + 1);
  let [code, text] = reps === 0 ? cues[0] : cues[1 + (reps % 2)];
  if (reps === target) [code, text] = ["TARGET_REACHED", "Target reached"];
  if (reps > target) [code, text] = ["ABOVE_TARGET", "Above target"];
  return {
    id: sessionId, source: "replay", exercise: "squat", station: "Station 1",
    participants: [{ id: who, reps, target, cue: text, cue_code: code, display_text: text,
      range_score: reps ? Math.round(100 * Math.ceil(reps / 2) / reps) : null }],
  };
}

// Full dashboard snapshot (the `workout` schema) with the good/short counts and
// tracking coverage the OLED shows. Every other rep falls short of the range.
const startedAt = new Date().toISOString();
function dashboard(session, tick) {
  const p = session.participants[0];
  const full = Math.ceil(p.reps / 2), short = p.reps - full;
  return {
    id: sessionId, source: "replay", exercise: "squat", exercise_label: "Squats",
    station: "Station 1", started_at: startedAt, finished_at: null,
    criteria: { description: "Fake relay test data", angle_label: "Knee angle", rest_angle: 170,
      start_angle: 150, full_angle: 100, increasing: false, minimum_confidence: 0.3 },
    participants: [{
      id: who, label: who, lane: 0, target, reps: p.reps, full, short,
      last_range: p.reps ? (p.reps % 2 ? "full" : "short") : null,
      range_score: p.range_score, tracking_coverage: 85 + (tick % 13), tracking_losses: 0,
      discarded_attempts: 0, target_remaining: Math.max(0, target - p.reps), issues: [],
      rep_details: Array.from({ length: p.reps }, (_, i) =>
        ({ number: i + 1, peak_angle: i % 2 ? 120 : 95, reached_range: i % 2 === 0 })),
      cue: p.cue,
    }],
  };
}

let stopped = false;
const stop = async () => {
  if (stopped) return; stopped = true;
  await publish(null);
  console.log("published: no session");
  process.exit(0);
};
process.on("SIGINT", stop);
for (let tick = 0; tick < seconds && !stopped; tick++) {
  const s = snapshot(tick);
  const d = dashboard(s, tick);
  await publish(s, d);
  const p = s.participants[0], r = d.participants[0];
  console.log(`t=${tick}s ${p.id} reps ${p.reps}/${p.target} good ${r.full} short ${r.short} ` +
    `range ${p.range_score ?? "-"}% track ${r.tracking_coverage}% cue ${p.display_text}`);
  await new Promise((r) => setTimeout(r, 1000));
}
await stop();
