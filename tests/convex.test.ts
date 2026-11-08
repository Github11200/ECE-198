import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { anyApi } from "convex/server";
import schema from "../convex/schema";
import sample from "./workout.json";

const modules = import.meta.glob("../convex/**/*.js");
const token = "test-read-token";
const paginationOpts = { numItems: 2, cursor: null };
const event = (sequence = 1, kind = "start", changes = {}) => ({
  sequence, kind, eventId: `event-${sequence}`, snapshot: structuredClone(sample), ...changes,
});
let t: ReturnType<typeof convexTest>;
beforeEach(() => { t = convexTest(schema, modules); vi.stubEnv("FEEDBACK_READ_TOKEN", token); vi.stubEnv("FEEDBACK_PUBLISH_TOKEN", "publish"); });
afterEach(() => vi.unstubAllEnvs());
const ingest = (data: ReturnType<typeof event>) => t.mutation(anyApi.archive.ingest, { event: data });
const completed = (id = sample.id) => ({ ...structuredClone(sample), id, finished_at: "2026-11-08T18:00:00+00:00" });
const rows = (table: string) => t.run(ctx => ctx.db.query(table).collect());

describe("session archive", () => {
  it("creates one session and separate attendance records for each person atomically", async () => {
    await ingest(event());
    expect(await rows("sessions")).toHaveLength(1);
    expect(await rows("people")).toHaveLength(2);
    expect((await rows("attendance")).map(a => a.participantId).sort()).toEqual(["P01", "P27"]);
    expect((await rows("sessions"))[0].snapshot).toEqual(sample);
    expect((await t.query(anyApi.archive.history, { token, paginationOpts })).page).toEqual([]);
  });
  it("updates metrics, preserves full pose data, finishes, and deduplicates every retry", async () => {
    await ingest(event());
    const snapshot = structuredClone(sample);
    snapshot.participants[0].reps = 1;
    snapshot.participants[0].full = 1;
    snapshot.participants[0].short = 0;
    snapshot.participants[0].rep_details = [{number: 1, peak_angle: 65, reached_range: true}];
    const pose = { frame: 1, poses: [Array(51).fill(0.9), null], lane_counts: [1, 0] };
    const update = event(2, "update", { snapshot, pose });
    await ingest(update); await ingest(update);
    expect(await rows("poseFrames")).toHaveLength(1);
    expect((await rows("poseFrames"))[0].pose).toEqual(pose);
    const finish = event(3, "finish", { snapshot: { ...snapshot, finished_at: completed().finished_at } });
    await ingest(finish); await ingest(finish);
    expect(await rows("sessions")).toHaveLength(1);
    expect(await rows("attendance")).toHaveLength(2);
    expect((await t.query(anyApi.archive.history, { token, paginationOpts })).page[0]).toEqual(finish.snapshot);
  });
  it("does not regress completed state when an older or newer active upload arrives", async () => {
    await ingest(event(3, "finish", { snapshot: completed() }));
    await ingest(event(2, "update")); await ingest(event(4, "update"));
    expect((await rows("sessions"))[0].snapshot.finished_at).not.toBeNull();
    expect((await rows("sessions"))[0].sequence).toBe(3);
  });
  it("preserves a delayed raw frame without rolling back final metrics", async () => {
    await ingest(event(5, "finish", { snapshot: completed() }));
    await ingest(event(2, "update", { pose: { frame: 2, poses: [null, null] } }));
    expect(await rows("poseFrames")).toHaveLength(1);
    expect((await rows("sessions"))[0].sequence).toBe(5);
  });
  it("reuses people across sessions and scopes personal history to their own metrics", async () => {
    await ingest(event(1, "finish", { snapshot: completed() }));
    const other = completed("b".repeat(32)); other.participants = [other.participants[0]];
    await ingest(event(2, "finish", { snapshot: other }));
    expect(await rows("people")).toHaveLength(2);
    expect(await rows("attendance")).toHaveLength(3);
    const p01 = await t.query(anyApi.archive.personHistory, { token, participantId: "P01", paginationOpts });
    expect(p01.page).toHaveLength(2);
    expect(p01.page.every(s => s.participants.length === 1 && s.participants[0].id === "P01")).toBe(true);
    const p27 = await t.query(anyApi.archive.personHistory, { token, participantId: "P27", paginationOpts });
    expect(p27.page).toHaveLength(1);
    expect((await t.query(anyApi.archive.personHistory, { token, participantId: "P99", paginationOpts })).page).toEqual([]);
  });
  it("paginates beyond the previous 30-report limit without dropping records", async () => {
    for (let i = 0; i < 35; i++) {
      const snapshot = completed(String(i).padStart(32, "0"));
      snapshot.started_at = new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString();
      await ingest(event(i + 1, "import", { snapshot }));
    }
    let cursor = null; const ids: string[] = [];
    do {
      const page = await t.query(anyApi.archive.history, { token, paginationOpts: { numItems: 7, cursor } });
      ids.push(...page.page.map(s => s.id)); cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
    expect(ids).toHaveLength(35); expect(new Set(ids).size).toBe(35);
    expect(ids[0]).toBe(String(34).padStart(32, "0"));
  });
  it.each([
    ["duplicate people", s => s.participants.push(s.participants[0])],
    ["invalid ID", s => s.participants[0].id = "P00"],
  ])("rejects %s and leaves no partial records", async (_, change) => {
    const snapshot = structuredClone(sample); change(snapshot);
    await expect(ingest(event(1, "start", { snapshot }))).rejects.toThrow();
    expect(await rows("sessions")).toHaveLength(0); expect(await rows("people")).toHaveLength(0);
  });
  it("rejects roster changes and invalid lifecycle or malformed pose uploads", async () => {
    await ingest(event());
    const snapshot = structuredClone(sample); snapshot.participants.pop();
    await expect(ingest(event(2, "update", { snapshot }))).rejects.toThrow("roster");
    await expect(ingest(event(2, "finish"))).rejects.toThrow("lifecycle");
    await expect(ingest(event(0))).rejects.toThrow("lifecycle");
    await expect(ingest(event(2, "update", { pose: { frame: 1, poses: [[1], null] } }))).rejects.toThrow("pose");
    expect((await rows("sessions"))[0].sequence).toBe(1);
  });
  it("queries paginated raw frames for only the selected session", async () => {
    await ingest(event(1, "update", { pose: { frame: 1, poses: [null, null] } }));
    const result = await t.query(anyApi.archive.frames, { token, sessionId: sample.id, paginationOpts });
    expect(result.page[0].pose.frame).toBe(1);
    expect((await t.query(anyApi.archive.frames, { token, sessionId: "missing", paginationOpts })).page).toEqual([]);
  });
});

describe("access and live feedback", () => {
  it.each(["archive:history", "archive:personHistory", "archive:frames", "feedback:live"])("rejects missing/wrong read credentials for %s", async name => {
    const args = { token: "wrong", ...(name.startsWith("archive") ? { paginationOpts } : {}),
      ...(name.includes("personHistory") ? { participantId: "P01" } : {}), ...(name.includes("frames") ? { sessionId: sample.id } : {}) };
    const [module, fn] = name.split(":");
    await expect(t.query(anyApi[module][fn], args)).rejects.toThrow("token");
    vi.stubEnv("FEEDBACK_READ_TOKEN", "");
    await expect(t.query(anyApi[module][fn], { ...args, token: "" })).rejects.toThrow("token");
  });
  it("publishes, replaces, expires, and clears the wearable mailbox", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const session = { id: sample.id, source: "camera", participants: [{id: "P01", reps: 1, target: 8, cue: "Ready"}] };
    await t.mutation(anyApi.feedback.publish, { session, dashboard: sample });
    expect((await t.query(anyApi.feedback.live, { token })).dashboard).toEqual(sample);
    expect((await t.query(anyApi.feedback.read, {participantId: "P01", now: 1000})).active).toBe(true);
    expect((await t.query(anyApi.feedback.read, {participantId: "P99", now: 1000})).active).toBe(false);
    expect((await t.query(anyApi.feedback.read, {participantId: "P01", now: 6001})).active).toBe(false);
    await t.mutation(anyApi.feedback.publish, {session: null});
    expect((await t.query(anyApi.feedback.live, {token})).dashboard).toBeNull();
    expect(await rows("feedback")).toHaveLength(1);
    vi.restoreAllMocks();
  });
  it.each(["/feedback", "/archive"])("protects HTTP writes to %s", async path => {
    expect((await t.fetch(path, {method: "POST", body: "{}"})).status).toBe(401);
    expect((await t.fetch(path, {method: "POST", headers: {Authorization: "Bearer publish"}, body: "bad-json"})).status).toBe(400);
  });
  it("accepts authorized HTTP archive/feedback writes and participant reads", async () => {
    expect((await t.fetch("/archive", {method: "POST", headers: {Authorization: "Bearer publish"}, body: JSON.stringify({event: event(1, "finish", {snapshot: completed()})})})).status).toBe(204);
    expect(await rows("sessions")).toHaveLength(1);
    const session = {id: sample.id, source: "camera", participants: [{id: "P01", reps: 2, target: 8, cue: "Ready"}]};
    expect((await t.fetch("/feedback", {method: "POST", headers: {Authorization: "Bearer publish"}, body: JSON.stringify({session, dashboard: sample})})).status).toBe(204);
    expect((await t.fetch("/feedback?participant_id=P01", {headers: {Authorization: `Bearer ${token}`}})).status).toBe(200);
    expect((await t.fetch("/feedback?participant_id=P00", {headers: {Authorization: `Bearer ${token}`}})).status).toBe(400);
    expect((await t.fetch("/feedback?participant_id=P01")).status).toBe(401);
  });
});
