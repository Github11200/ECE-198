import { untrack } from 'svelte';
import { makeFunctionReference } from 'convex/server';
import type { ConvexClient } from 'convex/browser';
import { liveFeedback } from './live-feedback.svelte';
import type { Workout } from './tracker-api';

type Page = { page: Workout[]; isDone: boolean; continueCursor: string };
type PageArgs = { token: string; paginationOpts: { numItems: number; cursor: string | null } };

const historyQuery = makeFunctionReference<'query', PageArgs, Page>('archive:history');
const personQuery = makeFunctionReference<'query', PageArgs & { participantId: string }, Page>(
	'archive:personHistory'
);

/**
 * Paginated completed-session archive from Convex, mirroring the original
 * useCloudHistory hook. Only one page is subscribed at a time per view, and
 * it resets whenever the Convex client, token or participant changes.
 */
class CloudHistoryStore {
	error = $state('');
	version = $state(0);

	#pages = new Map<number, Page>();
	#cursors: (string | null)[] = [null];
	#stops: Array<() => void> = [];
	#client: ConvexClient | null | undefined = undefined;
	#token = '';
	#participant: string | undefined = undefined;

	get records(): Workout[] {
		this.version;
		if (!liveFeedback.client) return [];
		const byId = new Map<string, Workout>();
		for (const index of [...this.#pages.keys()].sort((a, b) => a - b)) {
			for (const session of this.#pages.get(index)!.page) byId.set(session.id, session);
		}
		return [...byId.values()];
	}

	get last(): Page | undefined {
		this.version;
		return this.#pages.get(this.#cursors.length - 1);
	}

	get loading() {
		return Boolean(liveFeedback.client && !this.last && !this.error);
	}

	get hasMore() {
		return Boolean(this.last && !this.last.isDone);
	}

	loadMore() {
		const last = this.last;
		if (!last || last.isDone) return;
		this.#cursors = [...this.#cursors, last.continueCursor];
		this.#subscribe();
	}

	/** Call from a component effect. Re-subscribes when the connection or participant changes. */
	follow(participantId?: string) {
		// Only the connection and token are dependencies of the caller's effect.
		// Everything else runs untracked so the store's own writes cannot re-trigger it.
		const client = liveFeedback.client;
		const token = liveFeedback.token;
		untrack(() => {
			if (client === this.#client && token === this.#token && participantId === this.#participant) return;
			this.#stop();
			this.#client = client;
			this.#token = token;
			this.#participant = participantId;
			this.#cursors = [null];
			this.#pages = new Map();
			this.error = '';
			this.version++;
			this.#subscribe();
		});
	}

	/** Stops subscriptions when a view unmounts. Cached records are rebuilt on the next follow. */
	stop() {
		untrack(() => {
			this.#stop();
			this.#client = undefined;
		});
	}

	#stop() {
		for (const stop of this.#stops) stop();
		this.#stops = [];
	}

	#subscribe() {
		this.#stop();
		const client = this.#client;
		if (!client) return;
		const token = this.#token;
		const participantId = this.#participant;
		this.#stops = this.#cursors.map((cursor, index) => {
			const paginationOpts = { numItems: 20, cursor };
			const update = (page: Page) => {
				this.#pages.set(index, page);
				this.error = '';
				this.version++;
			};
			const fail = (cause: Error) => {
				this.error = cause.message;
			};
			return participantId
				? client.onUpdate(personQuery, { token, participantId, paginationOpts }, update, fail)
				: client.onUpdate(historyQuery, { token, paginationOpts }, update, fail);
		});
	}
}

export const cloudHistory = new CloudHistoryStore();
