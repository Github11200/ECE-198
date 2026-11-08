import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const session = v.union(
  v.null(),
  v.object({
    id: v.string(),
    source: v.union(v.literal("replay"), v.literal("camera"), v.literal("recording")),
    exercise: v.optional(v.string()),
    station: v.optional(v.string()),
    frame: v.optional(v.union(v.number(), v.null())),
    participants: v.array(v.object({
      id: v.string(),
      reps: v.number(),
      target: v.number(),
      cue: v.string(),
      angle: v.optional(v.union(v.number(), v.null())),
      cue_code: v.optional(v.union(v.literal('READY'), v.literal('RANGE_OK'),
        v.literal('CHECK_RANGE'), v.literal('TRACKING_LOST'),
        v.literal('TARGET_REACHED'), v.literal('ABOVE_TARGET'))),
      display_text: v.optional(v.string()),
      range_score: v.optional(v.union(v.number(), v.null())),
    })),
  }),
);

// Full dashboard state accompanies the compact wearable payload.
const nullableNumber = v.union(v.number(), v.null());
export const participantResult = v.object({
    id: v.string(), label: v.string(), lane: v.number(), target: v.number(), reps: v.number(),
    full: v.number(), short: v.number(), last_range: v.union(v.string(), v.null()),
    range_score: nullableNumber, tracking_coverage: nullableNumber,
    tracking_losses: nullableNumber, discarded_attempts: nullableNumber,
    target_remaining: v.number(), issues: v.array(v.string()),
    rep_details: v.array(v.object({number: v.number(), peak_angle: v.number(), reached_range: v.boolean()})),
    angle: v.optional(nullableNumber), cue: v.optional(v.string()), tracking_reason: v.optional(v.string()),
});

export const workout = v.object({
  id: v.string(), source: v.union(v.literal("camera"), v.literal("replay"), v.literal("recording")),
  exercise: v.string(), exercise_label: v.string(), station: v.string(),
  started_at: v.string(), finished_at: v.union(v.string(), v.null()),
  criteria: v.object({description: v.string(), angle_label: v.string(),
    rest_angle: v.number(), start_angle: v.number(), full_angle: v.number(),
    increasing: v.boolean(), minimum_confidence: v.number()}),
  replay_done: v.optional(v.boolean()), last_frame: v.optional(v.number()),
  participants: v.array(participantResult),
});
export const dashboard = v.union(v.null(), workout);


export const pose = v.object({
  frame: v.number(), poses: v.array(v.union(v.null(), v.array(v.number()))),
  lane_counts: v.optional(v.array(v.number())),
});
export const archiveEvent = v.object({
  eventId: v.string(), sequence: v.number(),
  kind: v.union(v.literal("start"), v.literal("update"), v.literal("finish"), v.literal("import")),
  snapshot: workout, pose: v.optional(pose),
});

export default defineSchema({
  people: defineTable({ externalId: v.string(), label: v.string() }).index("by_externalId", ["externalId"]),
  sessions: defineTable({ externalId: v.string(), status: v.union(v.literal("active"), v.literal("completed")),
    startedAt: v.string(), sequence: v.number(), snapshot: workout })
    .index("by_externalId", ["externalId"]).index("by_status_and_startedAt", ["status", "startedAt"]),
  attendance: defineTable({ sessionId: v.id("sessions"), personId: v.id("people"),
    participantId: v.string(), startedAt: v.string(), result: participantResult })
    .index("by_person_and_startedAt", ["participantId", "startedAt"])
    .index("by_session_and_person", ["sessionId", "personId"]),
  poseFrames: defineTable({ sessionId: v.id("sessions"), eventId: v.string(), receivedAt: v.number(),
    pose, snapshot: workout })
    .index("by_session", ["sessionId"]).index("by_eventId", ["eventId"]),
  feedback: defineTable({ key: v.string(), updatedAt: v.number(), session, dashboard: v.optional(dashboard) })
    .index("by_key", ["key"]),
});
