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

async function publish(session) {
  const res = await fetch(`${site}/feedback`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ session }),
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
  await publish(s);
  const p = s.participants[0];
  console.log(`t=${tick}s ${p.id} ${p.reps}/${p.target} ${p.cue_code}`);
  await new Promise((r) => setTimeout(r, 1000));
}
await stop();
