// Real HTTP + WebSocket integration. Requires a running LOCAL `npx convex dev`.
// Never runs against a cloud or production deployment.
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import { ConvexClient } from "convex/browser";
import { anyApi } from "convex/server";

const url = process.env.CONVEX_TEST_URL || "http://127.0.0.1:3210";
const site = process.env.CONVEX_TEST_SITE_URL || "http://127.0.0.1:3212";
for (const address of [url, site]) assert.equal(new URL(address).hostname, "127.0.0.1", "Local backend only");
const token = "local-test-read", publishToken = "local-test-publish";
const dir = await mkdtemp(join(tmpdir(), "cccare-live-"));
const socket = createServer();
await new Promise(resolve => socket.listen(0, "127.0.0.1", resolve));
const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
const laptop = `http://127.0.0.1:${port}`;
const processHandle = spawn("python", ["-m", "backend.tracker.server", "--port", String(port), "--db", join(dir, "test.sqlite3")], {stdio: "ignore"});
const client = new ConvexClient(url);
let stopLive, stopHistory;
async function local(path, body) {
  const response = await fetch(laptop + path, body === undefined ? {} : {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)});
  assert.ok(response.ok, await response.clone().text()); return response.json();
}
function waitFor(setup, predicate) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Subscription timed out")), 10000);
    setup(value => { if(predicate(value)) { clearTimeout(timer); resolve(value); } });
  });
}
async function flush() {
  const result = spawnSync("python", ["-c", "import sys; from backend.wearable.publish_feedback import sync_pending; sync_pending(sys.argv[1], sys.argv[2], sys.argv[3])", laptop, site, publishToken], {encoding:"utf8"});
  assert.equal(result.status, 0, result.stderr);
}
try {
  for(let i=0;i<50;i++) { try { await local("/api/session"); break; } catch { await sleep(100); } }
  const started = await local("/api/session/start", {source:"camera", targets:[8,10], participant_ids:["P01","P27"]});
  const push = waitFor(update => { stopLive = client.onUpdate(anyApi.feedback.live, {token}, update); }, value => value?.dashboard?.id === started.id);
  // Exercise the same publisher functions used by the relay, through actual HTTP routes.
  await flush();
  const payload = {dashboard:started, session:{id:started.id, source:"camera", participants:started.participants.map(p=>({id:p.id,reps:p.reps,target:p.target,cue:p.cue}))}};
  assert.equal((await fetch(site+"/feedback", {method:"POST", headers:{Authorization:`Bearer ${publishToken}`, "Content-Type":"application/json"}, body:JSON.stringify(payload)})).status, 204);
  assert.equal((await push).dashboard.id, started.id);
  await local("/api/pose", {session_id:started.id, frame:1, poses:[Array(51).fill(0.9),null], lane_counts:[1,0]});
  const final = await local("/api/session/finish", {session_id:started.id});
  const historyPush = waitFor(update => { stopHistory=client.onUpdate(anyApi.archive.history, {token,paginationOpts:{numItems:50,cursor:null}}, update); }, page=>page.page.some(s=>s.id===started.id));
  await flush();
  assert.deepEqual((await historyPush).page.find(s=>s.id===started.id),final);
  const personal = await client.query(anyApi.archive.personHistory,{token,participantId:"P27",paginationOpts:{numItems:50,cursor:null}});
  assert.deepEqual(personal.page.find(s=>s.id===started.id).participants.map(p=>p.id),["P27"]);
  const frames=await client.query(anyApi.archive.frames,{token,sessionId:started.id,paginationOpts:{numItems:10,cursor:null}});
  assert.equal(frames.page.length,1); assert.equal(frames.page[0].pose.poses[0].length,51);
  await flush();
  assert.equal((await local("/api/convex/status")).pending,0);
  console.log("PASS: laptop start → raw pose → stop → durable upload → Convex history + personal results + WebSocket push + acknowledgement");
} finally {
  stopLive?.(); stopHistory?.(); await client.close();
  processHandle.kill(); await new Promise(resolve=>processHandle.once("exit",resolve));
  await rm(dir,{recursive:true,force:true});
}
