import { getFunctionName } from 'convex/server';
import type { Workout } from '#lib/tracker-api.js';

type Snapshot = { updatedAt: number; dashboard: Workout | null } | null;
type Subscription = {
	name: string;
	args: { token?: string; participantId?: string; paginationOpts?: { cursor: string | null } };
	update: (value: unknown) => void;
	error: (cause: Error) => void;
	stopped: boolean;
};

/** In-memory stand-in for the Convex deployment the dashboards read from. */
export const convexServer = {
	token: 'read',
	snapshot: null as Snapshot,
	history: [] as Workout[],
	archiveError: '',
	subscriptions: [] as Subscription[]
};

function deliver(sub: Subscription) {
	if (sub.stopped) return;
	if (sub.args.token !== convexServer.token) {
		sub.error(new Error('Invalid feedback read token.'));
		return;
	}
	if (sub.name === 'feedback:live') {
		sub.update(convexServer.snapshot);
		return;
	}
	if (convexServer.archiveError) {
		sub.error(new Error(convexServer.archiveError));
		return;
	}
	const records =
		sub.name === 'archive:personHistory'
			? convexServer.history.filter((session) =>
					session.participants.some((p) => p.id === sub.args.participantId)
				)
			: convexServer.history;
	sub.update({ page: records, isDone: true, continueCursor: '' });
}

/** Pushes a new live snapshot to every connected feedback subscription. */
export function pushLive(snapshot: Snapshot) {
	convexServer.snapshot = snapshot;
	for (const sub of convexServer.subscriptions) {
		if (!sub.stopped && sub.name === 'feedback:live') sub.update(snapshot);
	}
}

export class FakeConvexClient {
	constructor(public url: string) {}

	close() {}

	onUpdate(query: unknown, args: Subscription['args'], update: Subscription['update'], error: Subscription['error']) {
		const sub: Subscription = { name: getFunctionName(query as never), args, update, error, stopped: false };
		convexServer.subscriptions.push(sub);
		deliver(sub);
		return () => {
			sub.stopped = true;
		};
	}
}
