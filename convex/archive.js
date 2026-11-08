import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { archiveEvent, workout, pose } from "./schema";

/** @param {string} token */
function authorize(token) {
  if (!process.env.FEEDBACK_READ_TOKEN || token !== process.env.FEEDBACK_READ_TOKEN) {
    throw new Error("Invalid feedback read token");
  }
}
/** @template {import("convex/values").GenericValidator} V
 * @param {V} item */
const pageOf = (item) => v.object({ page: v.array(item), isDone: v.boolean(), continueCursor: v.string() });

export const ingest = internalMutation({
  args: { event: archiveEvent }, returns: v.null(),
  handler: async (ctx, { event }) => {
    const { snapshot, sequence, kind } = event;
    const completed = snapshot.finished_at !== null;
    if (!snapshot.participants.length || snapshot.participants.length > 5 ||
        new Set(snapshot.participants.map(p => p.id)).size !== snapshot.participants.length ||
        snapshot.participants.some(p => !/^P(?:0[1-9]|[1-9][0-9])$/.test(p.id))) {
      throw new Error("Invalid session participants");
    }
    if (!Number.isSafeInteger(sequence) || sequence < 1 ||
        ((kind === "finish" || kind === "import") !== completed)) {
      throw new Error("Invalid session lifecycle event");
    }
    if (event.pose && (event.pose.poses.length !== snapshot.participants.length ||
        !Number.isSafeInteger(event.pose.frame) || event.pose.frame < 0 ||
        event.pose.poses.some(p => p !== null && (p.length !== 51 || p.some(n => !Number.isFinite(n)))))) {
      throw new Error("Invalid pose frame");
    }
    let saved = await ctx.db.query("sessions").withIndex("by_externalId", q => q.eq("externalId", snapshot.id)).unique();
    if (saved && (saved.snapshot.started_at !== snapshot.started_at ||
        saved.snapshot.source !== snapshot.source || saved.snapshot.exercise !== snapshot.exercise ||
        saved.snapshot.station !== snapshot.station ||
        saved.snapshot.participants.map(p => p.id).join(",") !== snapshot.participants.map(p => p.id).join(","))) {
      throw new Error("Session identity and roster cannot change");
    }
    // Frame deduplication is independent of latest-state ordering, so a delayed frame is preserved.
    if (saved && event.pose) {
      const exists = await ctx.db.query("poseFrames").withIndex("by_eventId", q => q.eq("eventId", event.eventId)).unique();
      if (!exists) await ctx.db.insert("poseFrames", { sessionId: saved._id, eventId: event.eventId,
        receivedAt: Date.now(), pose: event.pose, snapshot });
    }
    if (saved && (sequence <= saved.sequence || (saved.status === "completed" && !completed))) return null;
    const fields = { externalId: snapshot.id, status: /** @type {"completed" | "active"} */ (completed ? "completed" : "active"),
      startedAt: snapshot.started_at, sequence, snapshot };
    let sessionId;
    if (saved) { sessionId = saved._id; await ctx.db.patch(sessionId, fields); }
    else {
      sessionId = await ctx.db.insert("sessions", fields);
      if (event.pose) await ctx.db.insert("poseFrames", { sessionId, eventId: event.eventId,
        receivedAt: Date.now(), pose: event.pose, snapshot });
    }
    for (const result of snapshot.participants) {
      const person = await ctx.db.query("people").withIndex("by_externalId", q => q.eq("externalId", result.id)).unique();
      const personId = person?._id ?? await ctx.db.insert("people", { externalId: result.id, label: result.label });
      const attendance = await ctx.db.query("attendance")
        .withIndex("by_session_and_person", q => q.eq("sessionId", sessionId).eq("personId", personId)).unique();
      const data = { sessionId, personId, participantId: result.id, startedAt: snapshot.started_at, result };
      if (attendance) await ctx.db.patch(attendance._id, data);
      else await ctx.db.insert("attendance", data);
    }
    return null;
  },
});

export const history = query({
  args: { token: v.string(), paginationOpts: paginationOptsValidator }, returns: pageOf(workout),
  handler: async (ctx, { token, paginationOpts }) => {
    authorize(token);
    const result = await ctx.db.query("sessions").withIndex("by_status_and_startedAt", q => q.eq("status", "completed"))
      .order("desc").paginate(paginationOpts);
    return { page: result.page.map(s => s.snapshot), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const personHistory = query({
  args: { token: v.string(), participantId: v.string(), paginationOpts: paginationOptsValidator },
  returns: pageOf(workout),
  handler: async (ctx, { token, participantId, paginationOpts }) => {
    authorize(token);
    const result = await ctx.db.query("attendance")
      .withIndex("by_person_and_startedAt", q => q.eq("participantId", participantId))
      .order("desc").paginate(paginationOpts);
    const page = await Promise.all(result.page.map(async a => {
      const record = await ctx.db.get(a.sessionId);
      if (!record) throw new Error("Session record is missing");
      return { ...record.snapshot, participants: [a.result] };
    }));
    return { page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const frames = query({
  args: { token: v.string(), sessionId: v.string(), paginationOpts: paginationOptsValidator },
  returns: pageOf(v.object({ pose, snapshot: workout })),
  handler: async (ctx, { token, sessionId, paginationOpts }) => {
    authorize(token);
    const session = await ctx.db.query("sessions").withIndex("by_externalId", q => q.eq("externalId", sessionId)).unique();
    if (!session) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db.query("poseFrames").withIndex("by_session", q => q.eq("sessionId", session._id)).paginate(paginationOpts);
    return { page: result.page.map(({ pose, snapshot }) => ({ pose, snapshot })), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
