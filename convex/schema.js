import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const session = v.union(
  v.null(),
  v.object({
    id: v.string(),
    source: v.union(v.literal("replay"), v.literal("camera"), v.literal("recording")),
    exercise: v.optional(v.string()),
    station: v.optional(v.string()),
    participants: v.array(v.object({
      id: v.string(),
      reps: v.number(),
      target: v.number(),
      cue: v.string(),
      cue_code: v.optional(v.union(v.literal('READY'), v.literal('RANGE_OK'),
        v.literal('CHECK_RANGE'), v.literal('TRACKING_LOST'),
        v.literal('TARGET_REACHED'), v.literal('ABOVE_TARGET'))),
      display_text: v.optional(v.string()),
      range_score: v.optional(v.union(v.number(), v.null())),
    })),
  }),
);

export default defineSchema({
  feedback: defineTable({ key: v.string(), updatedAt: v.number(), session })
    .index("by_key", ["key"]),
});
