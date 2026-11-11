import { makeFunctionReference } from 'convex/server';
import type { ConvexClient } from 'convex/browser';
import type { Workout } from './tracker-api';

type Snapshot = { updatedAt: number; dashboard: Workout | null } | null;

const liveQuery = makeFunctionReference<'query', { token: string }, Snapshot>('feedback:live');
const convexUrl: string = import.meta.env.PUBLIC_CONVEX_URL ?? '';

/**
 * Live session feedback from Convex, as in the original Next.js provider.
 * Nothing is connected until the team's read token is entered. The snapshot
 * only counts as live while it is less than five seconds old.
 */
class LiveFeedbackStore {
	client = $state<ConvexClient | null>(null);
	token = $state('');
	snapshot = $state<Snapshot | undefined>(undefined);
	now = $state(0);
	error = $state('');

	#unsubscribe: (() => void) | null = null;
	#timer: ReturnType<typeof setInterval> | undefined;

	get configured() {
		return Boolean(convexUrl);
	}

	get fresh() {
		return Boolean(this.snapshot && this.now - this.snapshot.updatedAt <= 5000);
	}

	get active(): Workout | null {
		return this.fresh ? (this.snapshot?.dashboard ?? null) : null;
	}

	get loading() {
		return Boolean(convexUrl && this.token && this.snapshot === undefined && !this.error);
	}

	get message() {
		if (!convexUrl) return 'Live feedback requires PUBLIC_CONVEX_URL and a rebuilt frontend.';
		if (!this.token) return "Enter the team's feedback read token to connect to live Convex feedback.";
		return (
			this.error ||
			(this.snapshot === undefined
				? 'Connecting to Convex…'
				: !this.fresh
					? 'Waiting for the laptop feedback publisher.'
					: '')
		);
	}

	connect(token: string) {
		this.disconnect();
		if (!convexUrl || !token) {
			this.token = token;
			return;
		}
		this.token = token;
		this.error = '';
		void this.#open(token);
	}

	async #open(token: string) {
		let client: ConvexClient;
		try {
			const { ConvexClient: Client } = await import('convex/browser');
			client = new Client(convexUrl);
		} catch (cause) {
			this.error = cause instanceof Error ? cause.message : 'Invalid Convex URL';
			return;
		}
		if (token !== this.token) {
			void client.close();
			return;
		}
		this.client = client;
		this.#unsubscribe = client.onUpdate(
			liveQuery,
			{ token },
			(value) => {
				this.snapshot = value;
				this.now = Date.now();
				this.error = '';
			},
			(cause) => {
				this.error = cause.message;
				this.snapshot = undefined;
			}
		);
		// Local expiry only: this timer makes no network requests.
		this.#timer = setInterval(() => (this.now = Date.now()), 500);
	}

	disconnect() {
		this.#unsubscribe?.();
		if (this.#timer) clearInterval(this.#timer);
		if (this.client) void this.client.close();
		this.#unsubscribe = null;
		this.#timer = undefined;
		this.client = null;
		this.snapshot = undefined;
		this.now = 0;
		this.error = '';
	}
}

export const liveFeedback = new LiveFeedbackStore();
