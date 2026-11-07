import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const session = v.union(
  v.null(),
  v.object({
    id: v.string(),
    source: v.union(v.literal("replay"), v.literal("camera"), v.literal("recording")),
    participants: v.array(v.object({
      id: v.string(),
      reps: v.number(),
      target: v.number(),
      cue: v.string(),
    })),
  }),
);

export default defineSchema({
  feedback: defineTable({ key: v.string(), updatedAt: v.number(), session })
    .index("by_key", ["key"]),
});
