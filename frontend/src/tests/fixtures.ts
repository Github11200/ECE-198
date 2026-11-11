import { vi } from 'vitest';
import { tracker } from '#lib/tracker.svelte.js';
import { liveFeedback } from '#lib/live-feedback.svelte.js';
import { cloudHistory } from '#lib/cloud-history.svelte.js';
import { convexServer, pushLive } from './convex-mock';
import { screen } from '@testing-library/svelte';
import type { UserEvent } from '@testing-library/user-event';
import type { Exercise, ParticipantResult, SessionSetup, Workout } from '#lib/tracker-api.js';

export const exercises: Exercise[] = [
	{
		id: 'curl',
		label: 'Seated arm curl',
		category: 'Upper body',
		angle_label: 'Elbow angle',
		criteria: 'Elbow closes below 60° and returns above 150°.',
		help: 'Seated, light weight, controlled tempo.'
	},
	{
		id: 'stand',
		label: 'Sit to stand',
		category: 'Lower body',
		angle_label: 'Knee angle',
		criteria: 'Knee reaches 100° and extends above 160°.',
		help: 'Use a firm chair with arms folded.'
	}
];

export function person(overrides: Partial<ParticipantResult> & Pick<ParticipantResult, 'id' | 'lane'>): ParticipantResult {
	return {
		label: `Participant ${overrides.id.slice(1)}`,
		target: 10,
		reps: 0,
		full: 0,
		short: 0,
		last_range: null,
		range_score: null,
		tracking_coverage: 100,
		tracking_losses: 0,
		discarded_attempts: 0,
		target_remaining: 10,
		issues: [],
		rep_details: [],
		angle: null,
		cue: 'Hold steady.',
		tracking_reason: '',
		...overrides
	};
}

export function workout(overrides: Partial<Workout> & { id: string; participants: ParticipantResult[] }): Workout {
	return {
		source: 'replay',
		exercise: 'curl',
		exercise_label: 'Seated arm curl',
		station: 'Station 1',
		started_at: '2026-11-09T15:30:00Z',
		finished_at: '2026-11-09T16:00:00Z',
		criteria: { description: 'Fixed demo angles for the seated arm curl.', angle_label: 'Elbow angle' },
		...overrides
	};
}

/** Newest first, as the tracker API returns history. */
export const savedHistory: Workout[] = [
	workout({
		id: 'S2',
		exercise_label: 'Seated arm curl',
		started_at: '2026-11-09T15:30:00Z',
		participants: [
			person({
				id: 'P01',
				lane: 1,
				target: 10,
				reps: 8,
				full: 6,
				short: 2,
				range_score: 75,
				tracking_coverage: 92,
				tracking_losses: 1,
				discarded_attempts: 0,
				issues: ['Two attempts stopped short of the angle target.'],
				rep_details: [{ number: 1, peak_angle: 58.4, reached_range: true }]
			}),
			person({
				id: 'P02',
				lane: 2,
				target: 8,
				reps: 6,
				full: 6,
				short: 0,
				range_score: 100,
				tracking_coverage: 100,
				last_range: 'Reached'
			})
		]
	}),
	workout({
		id: 'S1',
		exercise: 'stand',
		exercise_label: 'Sit to stand',
		started_at: '2026-11-06T15:30:00Z',
		finished_at: '2026-11-06T16:00:00Z',
		participants: [
			person({ id: 'P01', lane: 1, target: 6, reps: 6, full: 6, short: 0, range_score: 100 })
		]
	})
];

export const liveWorkout: Workout = workout({
	id: 'LIVE',
	source: 'camera',
	finished_at: null,
	started_at: '2026-11-10T15:00:00Z',
	participants: [
		person({
			id: 'P03',
			lane: 1,
			target: 8,
			reps: 3,
			angle: 84,
			cue: 'Lower slowly to reach the range.',
			last_range: 'Short',
			range_score: 60,
			tracking_reason: ''
		}),
		person({
			id: 'P04',
			lane: 2,
			target: 8,
			reps: 1,
			angle: null,
			cue: '',
			tracking_reason: 'Waiting for a clear view of the arm.'
		})
	]
});

type ApiOptions = {
	history?: Workout[];
	live?: Workout | null;
	unavailable?: boolean;
	startError?: string;
	finishError?: string;
	archiveError?: string;
};

export type ApiCall = { method: string; path: string; body?: unknown };

/**
 * Replaces `fetch` with the Python API (exercises, start, finish) and seeds
 * the in-memory Convex deployment (archive and live snapshot).
 */
export function installTrackerApi(options: ApiOptions = {}) {
	const state = { unavailable: false, startError: '', finishError: '' };
	Object.assign(state, options);
	convexServer.history = options.history ?? savedHistory;
	convexServer.archiveError = options.archiveError ?? '';
	convexServer.snapshot = options.live ? { updatedAt: Date.now(), dashboard: options.live } : null;

	const calls: ApiCall[] = [];
	const json = (data: unknown, status = 200) =>
		new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

	const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
		const method = init?.method ?? 'GET';
		const body = init?.body ? JSON.parse(String(init.body)) : undefined;
		calls.push({ method, path, body });

		if (state.unavailable) throw new TypeError('Failed to fetch');
		if (method === 'GET' && path === '/api/exercises') {
			return json({ exercises, max_active_lanes: 5, identity_mode: 'manual' });
		}
		if (path === '/api/session/start') {
			if (state.startError) return json({ error: state.startError }, 409);
			const setup = body as SessionSetup;
			const exercise = exercises.find((item) => item.id === setup.exercise);
			const started = workout({
				id: 'LIVE-NEW',
				source: setup.source,
				exercise: setup.exercise,
				exercise_label: exercise?.label ?? setup.exercise,
				station: setup.station,
				started_at: new Date().toISOString(),
				finished_at: null,
				participants: setup.participant_ids.map((id, index) =>
					person({ id, lane: index + 1, target: setup.targets[index] })
				)
			});
			// The laptop publisher pushes the new session into Convex.
			pushLive({ updatedAt: Date.now(), dashboard: started });
			return json(started, 201);
		}
		if (path === '/api/session/finish') {
			if (state.finishError) return json({ error: state.finishError }, 500);
			const finished = { ...(liveWorkout as Workout), finished_at: new Date().toISOString() };
			pushLive({ updatedAt: Date.now(), dashboard: null });
			return json(finished);
		}
		return json({ error: `Unexpected ${method} ${path}` }, 404);
	});

	vi.stubGlobal('fetch', fetchMock);
	return { calls, fetch: fetchMock };
}

/** Enters the team's read token in the shared feedback form and connects. */
export async function connectFeedback(user: UserEvent) {
	await user.type(await screen.findByLabelText('Feedback read token'), 'read');
	await user.click(screen.getByRole('button', { name: 'Connect' }));
}

/** Clears the singleton stores between tests so earlier data cannot leak in. */
export function resetTracker() {
	tracker.destroy();
	liveFeedback.disconnect();
	liveFeedback.token = '';
	cloudHistory.stop();
	tracker.exercises = [];
	tracker.loading = true;
	tracker.connected = false;
	tracker.error = '';
	tracker.busy = false;
	tracker.maxLanes = 5;
}
