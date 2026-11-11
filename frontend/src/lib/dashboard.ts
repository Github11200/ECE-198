import {
	participantNeedsReview,
	participantStatus,
	type ParticipantResult,
	type Workout
} from './tracker-api';

/**
 * Pure view-model helpers for the admin and patient dashboards.
 * Kept free of Svelte and fetch so the rules behind every number and
 * filter can be unit-tested directly.
 */

export const DEFAULT_PARTICIPANT_IDS: readonly string[] = ['P01', 'P02', 'P03', 'P04', 'P05'];
export const PARTICIPANT_ID_PATTERN = /^P(0[1-9]|[1-9]\d)$/;
export const MAX_REP_TARGET = 99;

export type RosterEntry = {
	id: string;
	result: ParticipantResult | undefined;
	/** The live session when this person is in it, otherwise their latest saved session. */
	workout: Workout | null;
	live: boolean;
	/** Number of saved sessions that include this participant. */
	visits: number;
	needsReview: boolean;
	status: ReturnType<typeof participantStatus>;
};

export type RosterFilter = 'all' | 'review';

export function participantLabel(id: string) {
	return `Participant ${id.slice(1)}`;
}

/**
 * Builds one row per participant ID. IDs come from the default roster, every
 * saved session and the live session, so a person never disappears from the
 * admin view. The live result takes precedence over the saved one.
 * `history` is expected newest first, as the tracker API returns it.
 */
export function buildRoster(
	history: Workout[],
	active: Workout | null,
	baseIds: readonly string[] = DEFAULT_PARTICIPANT_IDS
): RosterEntry[] {
	const ids = new Set<string>([
		...baseIds,
		...history.flatMap((session) => session.participants.map((p) => p.id)),
		...(active?.participants.map((p) => p.id) ?? [])
	]);

	return [...ids].sort().map((id) => {
		const current = active?.participants.find((p) => p.id === id);
		const previous = history.find((session) => session.participants.some((p) => p.id === id));
		const live = Boolean(current);
		const result = current ?? previous?.participants.find((p) => p.id === id);
		return {
			id,
			result,
			workout: live && active ? active : (previous ?? null),
			live,
			visits: history.filter((session) => session.participants.some((p) => p.id === id)).length,
			needsReview: participantNeedsReview(result, live),
			status: participantStatus(result, live)
		};
	});
}

export function filterRoster(roster: RosterEntry[], search: string, filter: RosterFilter) {
	const term = search.trim().toLowerCase();
	return roster.filter((entry) => {
		const matchesSearch =
			!term || `${entry.id} ${participantLabel(entry.id)}`.toLowerCase().includes(term);
		const matchesFilter = filter === 'all' || entry.needsReview;
		return matchesSearch && matchesFilter;
	});
}

export type LaneDraft = { id: string; target: number };

/** Returns the first problem with the lane setup, or null when it can be started. */
export function validateLanes(lanes: LaneDraft[], maxLanes: number): string | null {
	if (lanes.length === 0) return 'Add at least one camera lane.';
	if (lanes.length > maxLanes) return `Use up to ${maxLanes} camera lanes.`;

	const seen = new Set<string>();
	for (const [index, lane] of lanes.entries()) {
		if (!PARTICIPANT_ID_PATTERN.test(lane.id)) {
			return `Lane ${index + 1} needs an ID from P01 to P99.`;
		}
		if (seen.has(lane.id)) return 'Assign a different participant ID to each lane.';
		seen.add(lane.id);

		if (!Number.isInteger(lane.target) || lane.target < 1 || lane.target > MAX_REP_TARGET) {
			return `Lane ${index + 1} needs a rep target from 1 to ${MAX_REP_TARGET}.`;
		}
	}
	return null;
}

export type PatientSession = { session: Workout; person: ParticipantResult };

/** Every saved session that includes the participant, newest first. */
export function patientSessions(history: Workout[], id: string): PatientSession[] {
	return history.flatMap((session) => {
		const person = session.participants.find((p) => p.id === id);
		return person ? [{ session, person }] : [];
	});
}

/** Participant IDs that have at least one saved session, plus the default roster. */
export function patientIds(history: Workout[]): string[] {
	const ids = new Set<string>([
		...DEFAULT_PARTICIPANT_IDS,
		...history.flatMap((session) => session.participants.map((p) => p.id))
	]);
	return [...ids].sort();
}

export function patientSummary(rows: PatientSession[]) {
	const scores = rows
		.map((row) => row.person.range_score)
		.filter((score): score is number => score != null);
	const latest = rows[0]?.person ?? null;
	return {
		attended: rows.length,
		averageRange: scores.length
			? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
			: null,
		latestReps: latest?.reps ?? null,
		latestTarget: latest?.target ?? null,
		notes: rows.filter((row) => row.person.issues.length > 0).length
	};
}
