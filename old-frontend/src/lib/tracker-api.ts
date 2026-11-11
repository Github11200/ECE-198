export type Source = "camera" | "replay" | "recording";

export const sourceNames: Record<Source, string> = {
  camera: "Live AlphaPose camera",
  replay: "Synthetic demo replay",
  recording: "AlphaPose JSON replay",
};

export type Exercise = {
  id: string;
  label: string;
  category: string;
  angle_label: string;
  criteria: string;
  help: string;
};

export type ParticipantResult = {
  id: string;
  label: string;
  lane: number;
  target: number;
  reps: number;
  full: number;
  short: number;
  last_range: string | null;
  range_score: number | null;
  tracking_coverage: number | null;
  tracking_losses: number | null;
  discarded_attempts: number | null;
  target_remaining: number;
  issues: string[];
  rep_details: { number: number; peak_angle: number; reached_range: boolean }[];
  angle?: number | null;
  cue?: string;
  tracking_reason?: string;
};

export type Workout = {
  id: string;
  source: Source;
  exercise: string;
  exercise_label: string;
  station: string;
  started_at: string;
  finished_at: string | null;
  criteria: { description: string; angle_label: string };
  participants: ParticipantResult[];
  replay_done?: boolean;
  last_frame?: number;
};

export type SessionSetup = {
  source: Source;
  exercise: string;
  station: string;
  participant_ids: string[];
  targets: number[];
};

export async function trackerRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
    cache: "no-store",
  });
  const data = await response.json().catch(() => {
    throw new Error("Tracker API unavailable. Open this website through the Python server.");
  });
  if (!response.ok) throw new Error(data.error || "The tracker request failed.");
  return data as T;
}

export function workoutDate(stamp: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto",
  }).format(new Date(stamp));
}

export function percent(value: number | null | undefined) {
  return value == null ? "Not recorded" : `${value}%`;
}

export function totalRangeScore(workout: Workout) {
  const reps = workout.participants.reduce((sum, p) => sum + p.reps, 0);
  const full = workout.participants.reduce((sum, p) => sum + p.full, 0);
  return reps ? Math.round(full * 100 / reps) : null;
}
