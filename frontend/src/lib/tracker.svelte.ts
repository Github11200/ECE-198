import { cloudHistory } from './cloud-history.svelte';
import { liveFeedback } from './live-feedback.svelte';
import {
	fetchExercises,
	finishSession,
	startSession,
	TrackerError,
	type Exercise,
	type SessionSetup,
	type Workout
} from './tracker-api';

const browser = typeof window !== 'undefined';

/**
 * Same data flow as the original useTracker hook:
 * - exercises are polled from the Python API;
 * - start and finish are sent to the Python API;
 * - the active session comes from Convex live feedback;
 * - saved sessions come from the Convex archive.
 */
class TrackerStore {
	exercises = $state<Exercise[]>([]);
	maxLanes = $state(5);
	loading = $state(true);
	connected = $state(false);
	error = $state('');
	busy = $state(false);

	#started = false;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#interval = 700;

	get session(): Workout | null {
		return liveFeedback.active;
	}

	get history() {
		return cloudHistory.records;
	}

	get historyLoading() {
		return cloudHistory.loading;
	}

	get historyHasMore() {
		return cloudHistory.hasMore;
	}

	get historyError() {
		return cloudHistory.error;
	}

	/** Errors from the Python API, the Convex archive or live feedback, in that order. */
	get combinedError() {
		return this.error || cloudHistory.error || liveFeedback.error;
	}

	loadMoreHistory() {
		cloudHistory.loadMore();
	}

	init() {
		if (!browser || this.#started) return;
		this.#started = true;
		void this.#poll();
	}

	async #poll() {
		try {
			const catalog = await fetchExercises();
			this.exercises = catalog.exercises;
			this.maxLanes = catalog.max_active_lanes ?? 5;
			this.connected = true;
			this.error = '';
			this.#interval = 5000;
		} catch (cause) {
			this.connected = false;
			this.error = cause instanceof Error ? cause.message : 'Waiting for the tracker server.';
			this.#interval = 1000;
		} finally {
			this.loading = false;
		}
		if (this.#started) this.#timer = setTimeout(() => void this.#poll(), this.#interval);
	}

	async start(setup: SessionSetup) {
		return this.#change(() => startSession(setup));
	}

	async finish(sessionId: string) {
		return this.#change(() => finishSession(sessionId));
	}

	async #change(request: () => Promise<Workout>) {
		if (this.busy) throw new TrackerError('A session request is already in progress.');
		this.busy = true;
		try {
			const result = await request();
			this.connected = true;
			return result;
		} finally {
			this.busy = false;
		}
	}

	destroy() {
		if (this.#timer) clearTimeout(this.#timer);
		this.#started = false;
	}
}

export const tracker = new TrackerStore();
