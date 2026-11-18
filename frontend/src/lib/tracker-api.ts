export type Source = 'camera' | 'replay' | 'recording';

export const sourceNames: Record<Source, string> = {
	camera: 'Live AlphaPose camera',
	replay: 'Replay',
	recording: 'AlphaPose JSON replay'
};

export const sourceShortNames: Record<Source, string> = {
	camera: 'Camera',
	replay: 'Replay',
	recording: 'Recording replay'
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
	/** Present for camera sessions when the tracker launched AlphaPose itself. */
	camera?: {
		state: 'starting' | 'running' | 'failed' | 'paused' | 'stopped';
		message: string;
	};
};

export type SessionSetup = {
	source: Source;
	exercise: string;
	station: string;
	participant_ids: string[];
	targets: number[];
};

export type ExerciseCatalog = {
	exercises: Exercise[];
	max_active_lanes: number;
	identity_mode: string;
};

export class TrackerError extends Error {
	/** HTTP status, or 0 when the tracker could not be reached at all. */
	readonly status: number;

	constructor(message: string, status = 0) {
		super(message);
		this.status = status;
	}
}

export async function trackerRequest<T>(path: string, body?: unknown): Promise<T> {
	let response: Response;
	try {
		response = await fetch(path, {
			method: body === undefined ? 'GET' : 'POST',
			headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(6000),
			cache: 'no-store'
		});
	} catch {
		throw new TrackerError(
			'The tracker API is unavailable. Open this page through the Python server or start the local tracker.'
		);
	}
	const data = await response.json().catch(() => {
		throw new TrackerError('The tracker returned an unreadable response.', response.status);
	});
	if (!response.ok) throw new TrackerError(data?.error || 'The tracker request failed.', response.status);
	return data as T;
}

export const fetchExercises = () => trackerRequest<ExerciseCatalog>('/api/exercises');
/** The laptop tracker's in-memory session, or null when none is running. */
export const fetchSession = () => trackerRequest<{ session: Workout | null }>('/api/session');
/** The 30 most recent sessions saved in the laptop's SQLite copy, newest first. */
export const fetchLocalHistory = () => trackerRequest<{ sessions: Workout[] }>('/api/history');
export const startSession = (setup: SessionSetup) =>
	trackerRequest<Workout>('/api/session/start', setup);
export const finishSession = (sessionId: string) =>
	trackerRequest<Workout>('/api/session/finish', { session_id: sessionId });
/** Relaunch AlphaPose for the active camera session after it failed or stopped. */
export const retryCamera = (sessionId: string) =>
	trackerRequest<Workout>('/api/camera/retry', { session_id: sessionId });

/**
 * The Python tracker renders a printable report for sessions saved on this
 * laptop (`GET /reports/<32 hex id>`). Other IDs have no report page.
 */
export function reportUrl(workout: Pick<Workout, 'id' | 'finished_at'>) {
	return workout.finished_at && /^[0-9a-f]{32}$/.test(workout.id) ? `/reports/${workout.id}` : null;
}

export function workoutDate(stamp: string) {
	return new Intl.DateTimeFormat('en-CA', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'America/Toronto'
	}).format(new Date(stamp));
}

export function shortDate(stamp: string) {
	return new Intl.DateTimeFormat('en-CA', {
		month: 'short',
		day: 'numeric',
		timeZone: 'America/Toronto'
	}).format(new Date(stamp));
}

export function percent(value: number | null | undefined) {
	return value == null ? 'Not recorded' : `${value}%`;
}

export function totalRangeScore(workout: Workout) {
	const reps = workout.participants.reduce((sum, p) => sum + p.reps, 0);
	const full = workout.participants.reduce((sum, p) => sum + p.full, 0);
	return reps ? Math.round((full * 100) / reps) : null;
}

export function totalReps(workout: Workout) {
	return workout.participants.reduce((sum, p) => sum + p.reps, 0);
}

export function totalTarget(workout: Workout) {
	return workout.participants.reduce((sum, p) => sum + p.target, 0);
}

export function participantNeedsReview(result: ParticipantResult | undefined, live = false) {
	if (!result) return false;
	return live ? result.angle == null || result.short > 0 : result.issues.length > 0;
}

export function participantStatus(result: ParticipantResult | undefined, live = false) {
	if (!result) return { label: 'Ready for setup', tone: 'neutral' as const };
	if (live) {
		return result.angle == null
			? { label: 'No clear view', tone: 'warning' as const }
			: { label: 'Tracking', tone: 'info' as const };
	}
	return participantNeedsReview(result)
		? { label: 'Review notes', tone: 'warning' as const }
		: { label: 'Target met', tone: 'success' as const };
}
