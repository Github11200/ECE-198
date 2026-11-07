import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { session } from "./schema";

function current(db) {
  return db.query("feedback").withIndex("by_key", (q) => q.eq("key", "current")).unique();
}

export const publish = internalMutation({
  args: { session },
  handler: async (ctx, { session }) => {
    const row = await current(ctx.db);
    const snapshot = { session, updatedAt: Date.now() };
    if (row) {
      await ctx.db.patch(row._id, snapshot);
    } else {
      await ctx.db.insert("feedback", { key: "current", ...snapshot });
    }
  },
});

export const read = internalQuery({
  args: { participantId: v.string(), now: v.number() },
  handler: async (ctx, { participantId, now }) => {
    const row = await current(ctx.db);
    if (!row?.session || now - row.updatedAt > 5000) return { active: false };
    const participant = row.session.participants.find((entry) => entry.id === participantId);
    if (!participant) return { active: false };
    return { active: true, session_id: row.session.id, source: row.session.source,
      exercise: row.session.exercise ?? 'right_arm_curl', station: row.session.station ?? 'Station 1',
      updated_at_ms: row.updatedAt, ...participant };
  },
});
