import { browser } from '$app/environment';
import {
	fetchExercises,
	fetchHistory,
	fetchSession,
	finishSession,
	startSession,
	TrackerError,
	type Exercise,
	type SessionSetup,
	type Workout
} from './tracker-api';

/**
 * One shared local-tracker store for the admin and participant portals.
 * Polling keeps the demo working with the Python API alone; optional Convex
 * live feedback overlays fresher session snapshots when configured.
 */
class TrackerStore {
	session = $state<Workout | null>(null);
	history = $state<Workout[]>([]);
	exercises = $state<Exercise[]>([]);
	loading = $state(true);
	historyLoading = $state(true);
	connected = $state(false);
	error = $state('');
	busy = $state(false);
	maxLanes = $state(5);

	#started = false;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#metadataAt = 0;
	#interval = 1000;

	async init() {
		if (!browser || this.#started) return;
		this.#started = true;
		await this.refreshAll();
		this.#schedule();
	}

	async refreshAll() {
		await Promise.all([this.refreshSession(), this.refreshExercises(true), this.refreshHistory()]);
		this.loading = false;
	}

	async refreshSession() {
		try {
			const session = await fetchSession();
			this.session = session;
			this.connected = true;
			this.error = '';
			this.#interval = 1000;
		} catch (cause) {
			this.connected = false;
			this.error = cause instanceof Error ? cause.message : 'Waiting for the tracker server.';
			this.#interval = 2500;
		} finally {
			this.loading = false;
		}
	}

	async refreshExercises(force = false) {
		if (!force && Date.now() < this.#metadataAt) return;
		try {
			const catalog = await fetchExercises();
			this.exercises = catalog.exercises;
			this.maxLanes = catalog.max_active_lanes ?? 5;
			this.#metadataAt = Date.now() + 15_000;
		} catch {
			// refreshSession owns the connection state.
		}
	}

	async refreshHistory() {
		this.historyLoading = true;
		try {
			this.history = await fetchHistory();
			this.error = '';
		} catch (cause) {
			if (!this.connected) {
				this.error = cause instanceof Error ? cause.message : 'Could not load saved sessions.';
			}
		} finally {
			this.historyLoading = false;
		}
	}

	async start(setup: SessionSetup) {
		if (this.busy) throw new TrackerError('A session request is already in progress.');
		this.busy = true;
		try {
			const workout = await startSession(setup);
			this.session = workout;
			this.connected = true;
			return workout;
		} finally {
			this.busy = false;
		}
	}

	async finish(sessionId: string) {
		if (this.busy) throw new TrackerError('A session request is already in progress.');
		this.busy = true;
		try {
			const workout = await finishSession(sessionId);
			this.session = null;
			this.history = [workout, ...this.history.filter((item) => item.id !== workout.id)];
			return workout;
		} finally {
			this.busy = false;
		}
	}

	#schedule() {
		this.#timer = setTimeout(async () => {
			if (!this.busy) {
				await this.refreshSession();
				await this.refreshExercises();
			}
			this.#schedule();
		}, this.#interval);
	}

	destroy() {
		if (this.#timer) clearTimeout(this.#timer);
		this.#started = false;
	}

	savedSessionsFor(participantId: string) {
		return this.history.filter((session) =>
			session.participants.some((person) => person.id === participantId)
		);
	}
}

export const tracker = new TrackerStore();
