// Cross-component contracts: what the Python tracker/relay actually sends, and what the
// SvelteKit frontend actually subscribes to, checked against the real Convex validators.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import schema from "../convex/schema";
import sample from "./workout.json";

const modules = import.meta.glob("../convex/**/*.js");
const token = "test-read-token";
const publish = { Authorization: "Bearer publish" };
let t: ReturnType<typeof convexTest>;
beforeEach(() => { t = convexTest(schema, modules); vi.stubEnv("FEEDBACK_READ_TOKEN", token); vi.stubEnv("FEEDBACK_PUBLISH_TOKEN", "publish"); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const rows = (table: string) => t.run(ctx => ctx.db.query(table).collect());
const post = (path: string, body: unknown) => t.fetch(path, { method: "POST", headers: publish, body: JSON.stringify(body) });
const paginationOpts = { numItems: 50, cursor: null };

const root = resolve(__dirname, "..");
const generated = spawnSync("python", [resolve(__dirname, "tracker_events.py")], {
  cwd: root, encoding: "utf8", env: { ...process.env, PYTHONPATH: root },
});
if (generated.error) console.warn("Python unavailable; skipping tracker contract tests");
else if (generated.status !== 0) throw new Error(`tests/tracker_events.py failed:\n${generated.stderr}`);
const real = generated.status === 0 ? JSON.parse(generated.stdout) : null;

describe.skipIf(!real)("real tracker archive events", () => {
  it("emits start, pose updates and finish; a restart does not re-import it", () => {
    expect(real.events.map((e: any) => e.kind)).toEqual(["start", "update", "update", "finish"]);
    expect(real.events.map((e: any) => e.sequence)).toEqual([1, 2, 3, 4]);
  });
  it("imports a report saved before the upload queue existed, once", () => {
    expect(real.imports.map((e: any) => [e.kind, e.sequence])).toEqual([["import", 5]]);
  });
  it("are accepted one at a time over HTTP, with retries deduplicated", async () => {
    for (const event of [...real.events, ...real.imports]) {
      expect((await post("/archive", { event })).status).toBe(204);
      expect((await post("/archive", { event })).status).toBe(204);
    }
    await expectArchived();
  });
  it("are accepted as one ordered batch, and a retried batch is a no-op", async () => {
    expect((await post("/archive", { events: [...real.events, ...real.imports] })).status).toBe(204);
    expect((await post("/archive", { events: [...real.events, ...real.imports] })).status).toBe(204);
    await expectArchived();
  });
  it("accept replay session snapshots", async () => {
    expect((await post("/archive", { events: real.replayEvents })).status).toBe(204);
    expect((await rows("sessions"))[0].snapshot.source).toBe("replay");
  });
  async function expectArchived() {
    const id = real.final.id;
    expect(await rows("sessions")).toHaveLength(1);
    expect(await rows("poseFrames")).toHaveLength(2);
    expect(await rows("attendance")).toHaveLength(2);
    const history = await t.query(anyApi.archive.history, { token, paginationOpts });
    expect(history.page.map((s: any) => s.id)).toEqual([id]);
    expect(history.page[0].finished_at).toBe(real.final.finished_at);
    expect(history.page[0].participants.map((p: any) => p.reps)).toEqual(real.final.participants.map((p: any) => p.reps));
    const personal = await t.query(anyApi.archive.personHistory, { token, participantId: "P27", paginationOpts });
    expect(personal.page[0].participants.map((p: any) => p.id)).toEqual(["P27"]);
    const frames = await t.query(anyApi.archive.frames, { token, sessionId: id, paginationOpts });
    expect(frames.page.map((f: any) => f.pose.frame)).toEqual([1, 2]);
  }
});

describe.skipIf(!real)("real relay feedback payloads", () => {
  it("publish the live dashboard to feedback:live and the wearable GET contract", async () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);
    expect((await post("/feedback", real.live)).status).toBe(204);
    const live = await t.query(anyApi.feedback.live, { token });
    expect(Object.keys(live).sort()).toEqual(["dashboard", "session", "updatedAt"]);
    expect(live.dashboard).toEqual(real.live.dashboard);
    expect(live.session).toEqual(real.live.session);
    const response = await t.fetch("/feedback?participant_id=P27", { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    expect(body).toMatchObject({ active: true, id: "P27", session_id: real.live.session.id, cue_code: expect.any(String) });
    expect((await post("/feedback", real.replayLive)).status).toBe(204);
    expect((await post("/feedback", real.idle)).status).toBe(204);
    expect(await t.query(anyApi.feedback.live, { token })).toMatchObject({ session: null, dashboard: null });
  });
});

describe("archive batches", () => {
  const event = (sequence: number, kind = "update", changes = {}) =>
    ({ sequence, kind, eventId: `event-${sequence}`, snapshot: structuredClone(sample), ...changes });
  it("commit atomically: one invalid event leaves nothing written", async () => {
    const bad = event(2, "update", { pose: { frame: 1, poses: [[1], null] } });
    expect((await post("/archive", { events: [event(1, "start"), bad] })).status).toBe(400);
    expect(await rows("sessions")).toHaveLength(0);
    expect(await rows("people")).toHaveLength(0);
  });
  it("reject empty and oversized batches", async () => {
    expect((await post("/archive", { events: [] })).status).toBe(400);
    const many = Array.from({ length: 101 }, (_, i) => event(i + 1, i ? "update" : "start"));
    expect((await post("/archive", { events: many })).status).toBe(400);
    expect(await rows("sessions")).toHaveLength(0);
  });
  it("apply in order so a finish inside the batch is final", async () => {
    const finished = { ...structuredClone(sample), finished_at: "2026-11-08T18:00:00+00:00" };
    const pose = (frame: number) => ({ frame, poses: [null, null] });
    const events = [event(1, "start"), ...[2, 3, 4].map(n => event(n, "update", { pose: pose(n) })),
      event(5, "finish", { snapshot: finished })];
    expect((await post("/archive", { events })).status).toBe(204);
    expect((await rows("sessions"))[0]).toMatchObject({ status: "completed", sequence: 5 });
    expect(await rows("poseFrames")).toHaveLength(3);
  });
});
