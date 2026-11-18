import { cloudHistory } from './cloud-history.svelte';
import { liveFeedback } from './live-feedback.svelte';
import {
	fetchExercises,
	fetchLocalHistory,
	fetchSession,
	finishSession,
	startSession,
	TrackerError,
	type Exercise,
	type SessionSetup,
	type Workout
} from './tracker-api';

const browser = typeof window !== 'undefined';

/**
 * Poll intervals (ms), matching legacy-dashboard/app.js (90 ms while a session
 * runs, 700 ms idle). The laptop tracker is on localhost, so these are cheap.
 */
const ACTIVE_INTERVAL = 90;
const IDLE_INTERVAL = 700;
const RETRY_INTERVAL = 1000;
const METADATA_INTERVAL = 30_000;
const HISTORY_INTERVAL = 10_000;

/**
 * Data flow:
 * - exercises, start and finish always go to the Python tracker API;
 * - the active session comes from the tracker's own `/api/session` whenever
 *   it answers (it is the source of truth and runs on this laptop), and from
 *   Convex live feedback otherwise (e.g. the page is not served by the tracker);
 * - saved sessions come from the Convex archive once a read token is entered,
 *   and from the tracker's local SQLite copy (`/api/history`) until then.
 */
class TrackerStore {
	exercises = $state<Exercise[]>([]);
	maxLanes = $state(5);
	loading = $state(true);
	connected = $state(false);
	error = $state('');
	busy = $state(false);

	/** Last `/api/session` answer; only used while `localReachable`. */
	localSession = $state<Workout | null>(null);
	localReachable = $state(false);
	localHistory = $state<Workout[]>([]);
	localHistoryLoaded = $state(false);
	/** True once `/api/history` has answered or failed at least once. */
	localHistoryChecked = $state(false);

	#started = false;
	#generation = 0;
	#revision = 0;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#metadataDue = 0;
	#historyDue = 0;

	get session(): Workout | null {
		return this.localReachable ? this.localSession : liveFeedback.active;
	}

	/** True when saved sessions come from the Convex archive rather than the laptop copy. */
	get cloudHistory() {
		return Boolean(liveFeedback.client) && !cloudHistory.error;
	}

	get history(): Workout[] {
		return this.cloudHistory ? cloudHistory.records : this.localHistory;
	}

	get historyLoading() {
		if (this.cloudHistory) return cloudHistory.loading;
		return this.loading || (this.connected && !this.localHistoryChecked);
	}

	/** Whether any history source can answer (Convex connected or the laptop copy loaded). */
	get historyAvailable() {
		return this.cloudHistory || this.localHistoryLoaded;
	}

	get historyHasMore() {
		return this.cloudHistory ? cloudHistory.hasMore : false;
	}

	get historyError() {
		return cloudHistory.error;
	}

	/** Errors from the Python API, the Convex archive or live feedback, in that order. */
	get combinedError() {
		return this.error || cloudHistory.error || liveFeedback.error;
	}

	loadMoreHistory() {
		if (this.cloudHistory) cloudHistory.loadMore();
	}

	init() {
		if (!browser || this.#started) return;
		this.#started = true;
		// A poll still in flight from an earlier init belongs to an old generation
		// and will not schedule another timer, so there is only ever one loop.
		const generation = ++this.#generation;
		this.#metadataDue = 0;
		this.#historyDue = 0;
		void this.#poll(generation);
	}

	async #poll(generation: number) {
		let interval = RETRY_INTERVAL;
		try {
			if (Date.now() >= this.#metadataDue || !this.exercises.length) {
				const catalog = await fetchExercises();
				if (generation !== this.#generation) return;
				this.exercises = catalog.exercises;
				this.maxLanes = catalog.max_active_lanes ?? 5;
				this.#metadataDue = Date.now() + METADATA_INTERVAL;
			}
			this.connected = true;
			this.error = '';
			await this.#pollSession(generation);
			if (generation !== this.#generation) return;
			if (Date.now() >= this.#historyDue) await this.#refreshHistory(generation);
			interval = this.session ? ACTIVE_INTERVAL : IDLE_INTERVAL;
		} catch (cause) {
			if (generation !== this.#generation) return;
			this.connected = false;
			this.localReachable = false;
			this.error = cause instanceof Error ? cause.message : 'Waiting for the tracker server.';
		} finally {
			if (generation === this.#generation) this.loading = false;
		}
		if (this.#started && generation === this.#generation) {
			this.#timer = setTimeout(() => void this.#poll(generation), interval);
		}
	}

	/** Reads the tracker's active session. A server without this route falls back to Convex. */
	async #pollSession(generation: number) {
		const revision = this.#revision;
		try {
			const { session } = await fetchSession();
			// A start/finish that happened meanwhile already set a newer state.
			if (generation !== this.#generation || revision !== this.#revision || this.busy) return;
			this.localSession = session;
			this.localReachable = true;
		} catch (cause) {
			if (generation !== this.#generation) return;
			this.localReachable = false;
			// Unreachable means the tracker is down; an HTTP error means an older server.
			if (!(cause instanceof TrackerError) || cause.status === 0) throw cause;
		}
	}

	async #refreshHistory(generation = this.#generation) {
		this.#historyDue = Date.now() + HISTORY_INTERVAL;
		try {
			const { sessions } = await fetchLocalHistory();
			if (generation !== this.#generation) return;
			this.localHistory = sessions;
			this.localHistoryLoaded = true;
		} catch {
			// Older trackers without /api/history: history then needs Convex.
		} finally {
			if (generation === this.#generation) this.localHistoryChecked = true;
		}
	}

	async start(setup: SessionSetup) {
		const workout = await this.#change(() => startSession(setup));
		this.localSession = workout;
		return workout;
	}

	async finish(sessionId: string) {
		const saved = await this.#change(() => finishSession(sessionId));
		this.localSession = null;
		void this.#refreshHistory();
		return saved;
	}

	async #change(request: () => Promise<Workout>) {
		if (this.busy) throw new TrackerError('A session request is already in progress.');
		this.busy = true;
		this.#revision++;
		try {
			const result = await request();
			this.connected = true;
			return result;
		} finally {
			this.#revision++;
			this.busy = false;
		}
	}

	destroy() {
		if (this.#timer) clearTimeout(this.#timer);
		this.#timer = undefined;
		this.#started = false;
		this.#generation++;
	}
}

export const tracker = new TrackerStore();
