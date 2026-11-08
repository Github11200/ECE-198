import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { session, dashboard } from "./schema";

/** @param {import("./_generated/server").QueryCtx["db"]} db */
function current(db) {
  return db.query("feedback").withIndex("by_key", (q) => q.eq("key", "current")).unique();
}

export const publish = internalMutation({
  args: { session, dashboard: v.optional(dashboard) },
  returns: v.null(),
  handler: async (ctx, { session, dashboard }) => {
    const row = await current(ctx.db);
    const snapshot = { session, dashboard: dashboard ?? null, updatedAt: Date.now() };
    if (row) {
      await ctx.db.patch(row._id, snapshot);
    } else {
      await ctx.db.insert("feedback", { key: "current", ...snapshot });
    }
    return null;
  },
});

export const read = internalQuery({
  args: { participantId: v.string(), now: v.number() },
  returns: v.union(v.object({active: v.literal(false)}), v.object({
    active: v.literal(true), session_id: v.string(),
    source: v.union(v.literal("camera"), v.literal("replay"), v.literal("recording")),
    exercise: v.string(), station: v.string(), updated_at_ms: v.number(),
    id: v.string(), reps: v.number(), target: v.number(), cue: v.string(),
    angle: v.optional(v.union(v.number(), v.null())),
    cue_code: v.optional(v.union(v.literal("READY"), v.literal("RANGE_OK"), v.literal("CHECK_RANGE"),
      v.literal("TRACKING_LOST"), v.literal("TARGET_REACHED"), v.literal("ABOVE_TARGET"))),
    display_text: v.optional(v.string()), range_score: v.optional(v.union(v.number(), v.null())),
  })),
  handler: async (ctx, { participantId, now }) => {
    const row = await current(ctx.db);
    if (!row?.session || now - row.updatedAt > 5000) return { active: /** @type {const} */ (false) };
    const participant = row.session.participants.find((entry) => entry.id === participantId);
    if (!participant) return { active: /** @type {const} */ (false) };
    return { active: /** @type {const} */ (true), session_id: row.session.id, source: row.session.source,
      exercise: row.session.exercise ?? 'right_arm_curl', station: row.session.station ?? 'Station 1',
      updated_at_ms: row.updatedAt, ...participant };
  },
});

// Client-callable does not mean anonymous: reuse the relay's read credential.
export const live = query({
  args: { token: v.string() },
  returns: v.union(v.null(), v.object({ updatedAt: v.number(), session, dashboard })),
  handler: async (ctx, { token }) => {
    if (!process.env.FEEDBACK_READ_TOKEN || token !== process.env.FEEDBACK_READ_TOKEN) {
      throw new Error("Invalid feedback read token");
    }
    const row = await current(ctx.db);
    return row ? { updatedAt: row.updatedAt, session: row.session, dashboard: row.dashboard ?? null } : null;
  },
});
