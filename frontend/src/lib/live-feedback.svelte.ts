import { makeFunctionReference } from 'convex/server';
import type { ConvexClient } from 'convex/browser';
import type { Workout } from './tracker-api';

type Snapshot = { updatedAt: number; dashboard: Workout | null } | null;

/** Turns a raw Convex server error ("[CONVEX Q(...)] [Request ID] Server Error Uncaught Error: ...") into readable text. */
export function convexErrorMessage(cause: unknown) {
	const raw = cause instanceof Error ? cause.message : String(cause);
	if (/Invalid feedback read token/i.test(raw)) {
		return 'Convex rejected the feedback read token. Check the token and connect again.';
	}
	const detail = raw.match(/Uncaught Error:\s*([^\n]*?)(?:\s+at\s|$)/)?.[1] ?? raw;
	return `Convex request failed: ${detail}`;
}

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
	#attempt = 0;
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
		if (!convexUrl)
			return "Convex is not configured (set PUBLIC_CONVEX_URL and rebuild). Showing data from this laptop's tracker only.";
		if (!this.token)
			return "Showing data from this laptop's tracker. Enter the team's feedback read token to connect to live Convex feedback and cloud history.";
		if (this.error) return this.error;
		if (this.snapshot === undefined) return 'Connecting to Convex…';
		// The publisher only heartbeats during a session, so an idle "no session"
		// snapshot is expected to be old; it is not a missing publisher.
		if (this.snapshot && !this.snapshot.dashboard) return 'Connected to Convex. No live session is running.';
		return this.fresh ? '' : 'Waiting for the laptop feedback publisher.';
	}

	connect(token: string) {
		this.disconnect();
		this.#attempt++;
		if (!convexUrl || !token) {
			this.token = token;
			return;
		}
		this.token = token;
		this.error = '';
		void this.#open(token, this.#attempt);
	}

	async #open(token: string, attempt: number) {
		let client: ConvexClient;
		try {
			const { ConvexClient: Client } = await import('convex/browser');
			client = new Client(convexUrl);
		} catch (cause) {
			this.error = cause instanceof Error ? cause.message : 'Invalid Convex URL';
			return;
		}
		// A newer connect/disconnect happened while the client module loaded.
		if (attempt !== this.#attempt) {
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
				this.error = convexErrorMessage(cause);
				this.snapshot = undefined;
			}
		);
		// Local expiry only: this timer makes no network requests.
		this.#timer = setInterval(() => (this.now = Date.now()), 500);
	}

	disconnect() {
		this.#attempt++;
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
