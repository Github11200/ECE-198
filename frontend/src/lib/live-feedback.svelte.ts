import { browser } from '$app/environment';
import { makeFunctionReference } from 'convex/server';
import type { ConvexClient } from 'convex/browser';
import type { Workout } from './tracker-api';

type Snapshot = { updatedAt: number; dashboard: Workout | null } | null;

const liveQuery = makeFunctionReference<{ token: string }, Snapshot>('feedback:live');
const convexUrl = import.meta.env.PUBLIC_CONVEX_URL ?? '';
const storageKey = 'cccare.feedback-token';

/**
 * Optional Convex live feedback. The local Python tracker remains the source
 * of truth for controls and saved reports; this only shortens cue latency.
 */
class LiveFeedbackStore {
	client = $state<ConvexClient | null>(null);
	token = $state('');
	snapshot = $state<Snapshot | undefined>(undefined);
	now = $state(0);
	error = $state('');
	loading = $state(false);
	configured = Boolean(convexUrl);

	#unsubscribe: (() => void) | null = null;
	#timer: ReturnType<typeof setInterval> | undefined;

	get fresh() {
		return Boolean(this.snapshot && this.now - this.snapshot.updatedAt <= 5000);
	}

	get active() {
		return this.fresh ? (this.snapshot?.dashboard ?? null) : null;
	}

	get status() {
		if (!this.configured) return 'Local tracker only';
		if (!this.token) return 'Live feedback not connected';
		if (this.error) return 'Live feedback unavailable';
		if (this.snapshot === undefined) return 'Connecting to live feedback…';
		if (!this.fresh) return 'Waiting for the laptop publisher';
		return 'Live feedback connected';
	}

	restore() {
		if (!browser || !this.configured) return;
		const saved = sessionStorage.getItem(storageKey);
		if (saved) void this.connect(saved, false);
	}

	async connect(token: string, remember = true) {
		if (!browser) return;
		if (!this.configured) {
			this.error = 'Set PUBLIC_CONVEX_URL and rebuild the frontend to enable live feedback.';
			return;
		}
		this.disconnect();
		this.token = token.trim();
		if (!this.token) return;
		this.loading = true;
		this.error = '';
		if (remember) sessionStorage.setItem(storageKey, this.token);
		try {
			const { ConvexClient } = await import('convex/browser');
			const client = new ConvexClient(convexUrl);
			this.client = client;
			this.#unsubscribe = client.onUpdate(
				liveQuery,
				{ token: this.token },
				(value) => {
					this.snapshot = value;
					this.now = Date.now();
					this.error = '';
					this.loading = false;
				},
				(cause) => {
					this.error = cause.message;
					this.snapshot = undefined;
					this.loading = false;
				}
			);
			this.#timer = setInterval(() => (this.now = Date.now()), 500);
		} catch (cause) {
			this.error = cause instanceof Error ? cause.message : 'Invalid Convex URL.';
			this.loading = false;
		}
	}

	disconnect() {
		if (this.#unsubscribe) this.#unsubscribe();
		if (this.#timer) clearInterval(this.#timer);
		if (this.client) void this.client.close();
		this.#unsubscribe = null;
		this.#timer = undefined;
		this.client = null;
		this.snapshot = undefined;
		this.now = 0;
		this.loading = false;
		if (browser) sessionStorage.removeItem(storageKey);
	}
}

export const liveFeedback = new LiveFeedbackStore();
