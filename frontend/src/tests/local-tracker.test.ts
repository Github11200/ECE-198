import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from '../routes/admin/+page.svelte';
import PatientPage from '../routes/patient/+page.svelte';
import LiveMonitorDialog from '#lib/components/admin/live-monitor-dialog.svelte';
import { tracker } from '#lib/tracker.svelte.js';
import { convexErrorMessage, liveFeedback } from '#lib/live-feedback.svelte.js';
import { reportUrl, type SessionSetup, type Workout } from '#lib/tracker-api.js';
import { exercises, person, resetTracker, workout } from './fixtures';

vi.mock('convex/browser', async () => ({ ConvexClient: (await import('./convex-mock')).FakeConvexClient }));

const HEX_ID = '0123456789abcdef0123456789abcdef';

/**
 * A stateful stand-in for the Python tracker (backend/tracker/server.py):
 * start, poll /api/session, finish, and /api/history, with no Convex token.
 */
function installLocalTracker(saved: Workout[] = []) {
	const state = { active: null as Workout | null, history: [...saved] };
	const calls: string[] = [];
	const json = (data: unknown, status = 200) =>
		new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

	const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
		const method = init?.method ?? 'GET';
		const body = init?.body ? JSON.parse(String(init.body)) : undefined;
		calls.push(`${method} ${path}`);
		if (path === '/api/exercises') return json({ exercises, max_active_lanes: 5, identity_mode: 'manual' });
		if (path === '/api/session') {
			// Each poll advances the replay by one rep for every lane, as the scorer would.
			if (state.active) {
				state.active = {
					...state.active,
					participants: state.active.participants.map((p) => ({ ...p, reps: p.reps + 1, angle: 70 }))
				};
			}
			return json({ session: state.active });
		}
		if (path === '/api/history') return json({ sessions: state.history });
		if (path === '/api/session/start') {
			const setup = body as SessionSetup;
			if (state.active) return json({ error: 'Finish the active session first.' }, 409);
			state.active = workout({
				id: HEX_ID,
				source: setup.source,
				exercise: setup.exercise,
				exercise_label: exercises.find((e) => e.id === setup.exercise)?.label ?? setup.exercise,
				station: setup.station,
				finished_at: null,
				participants: setup.participant_ids.map((id, index) =>
					person({ id, lane: index + 1, target: setup.targets[index] })
				)
			});
			return json(state.active, 201);
		}
		if (path === '/api/session/finish') {
			if (!state.active || state.active.id !== body.session_id) return json({ error: 'Session not found.' }, 404);
			const done = { ...state.active, finished_at: '2026-11-10T16:00:00Z' };
			state.history = [done, ...state.history];
			state.active = null;
			return json(done);
		}
		return json({ error: `Unexpected ${method} ${path}` }, 404);
	});
	vi.stubGlobal('fetch', fetchMock);
	return { state, calls };
}

beforeEach(() => {
	resetTracker();
});

describe('admin dashboard against the laptop tracker only (no Convex token)', () => {
	it('prepares a replay, shows live counts from /api/session, ends and saves, then lists it in history', async () => {
		const api = installLocalTracker();
		const user = userEvent.setup();
		render(AdminPage);

		const prepare = await screen.findByRole('button', { name: 'Prepare a session' });
		await waitFor(() => expect(prepare).toBeEnabled());
		await user.click(prepare);
		const setup = await screen.findByRole('dialog', { name: 'Prepare a group session' });
		await user.selectOptions(within(setup).getByLabelText('Pose input'), 'replay');
		await user.selectOptions(within(setup).getByLabelText('Participants'), '2');
		await user.click(within(setup).getByRole('button', { name: 'Start replay' }));

		const monitor = await screen.findByRole('dialog', { name: 'Seated arm curl · Station 1' });
		// Counts come from polling the tracker, not from Convex.
		await waitFor(() => expect(within(monitor).getByText('70°')).toBeInTheDocument(), { timeout: 3000 });
		const roster = within(monitor).getByRole('list', { name: 'Live roster' });
		expect(within(roster).getAllByRole('listitem')).toHaveLength(2);

		await user.click(within(monitor).getByRole('button', { name: 'End & save session' }));
		const summary = await screen.findByRole('dialog', { name: 'Session summary' });
		expect(within(summary).getByRole('link', { name: 'Open printable report' })).toHaveAttribute(
			'href',
			`/reports/${HEX_ID}`
		);
		expect(api.state.active).toBeNull();
		expect(screen.getByText(/Session saved on this laptop/)).toBeInTheDocument();

		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'));
		await user.click(screen.getByRole('tab', { name: 'Session history' }));
		const history = await screen.findByRole('table', { name: 'Completed sessions' });
		expect(within(history).getAllByRole('row')).toHaveLength(2);
		expect(screen.queryByText('Active session')).not.toBeInTheDocument();
	});

	it('shows a session already running on the tracker when the page opens', async () => {
		const api = installLocalTracker();
		api.state.active = workout({
			id: HEX_ID,
			finished_at: null,
			participants: [person({ id: 'P07', lane: 1 })]
		});
		render(AdminPage);
		expect(await screen.findByText('Active session')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'View live session' })).toBeInTheDocument();
	});
});

describe('patient view against the laptop tracker only', () => {
	it('lists saved sessions from /api/history without a Convex token', async () => {
		installLocalTracker([
			workout({ id: HEX_ID, participants: [person({ id: 'P01', lane: 1, reps: 7, target: 9 })] })
		]);
		render(PatientPage);
		const list = await screen.findByRole('list', { name: 'Saved sessions' });
		expect(within(list).getByText('7 / 9')).toBeInTheDocument();
	});
});

describe('live monitor dialog', () => {
	it('explains an empty monitor instead of rendering a blank dialog', async () => {
		render(LiveMonitorDialog, { open: true, session: null, busy: false, onEnd: () => {} });
		expect(await screen.findByRole('dialog', { name: 'Live session' })).toBeInTheDocument();
		expect(screen.getByText('No session is running on the tracker right now.')).toBeInTheDocument();
	});

	it('shows a save error inside the dialog', async () => {
		const session = workout({ id: 'X', finished_at: null, participants: [person({ id: 'P01', lane: 1 })] });
		render(LiveMonitorDialog, { open: true, session, busy: false, error: 'Disk is full.', onEnd: () => {} });
		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByRole('alert')).toHaveTextContent('Disk is full.');
	});
});

describe('tracker polling', () => {
	it('keeps a single poll loop when a page remounts while a request is in flight', async () => {
		vi.useFakeTimers();
		const api = installLocalTracker();
		tracker.init();
		tracker.destroy();
		tracker.init();
		await vi.advanceTimersByTimeAsync(10_000);
		tracker.destroy();
		const polls = api.calls.filter((call) => call === 'GET /api/session').length;
		// Idle polling is every 700 ms: about 14 polls in 10 s, not double that.
		expect(polls).toBeGreaterThan(10);
		expect(polls).toBeLessThanOrEqual(16);
	});
});

describe('reportUrl', () => {
	it('links only saved tracker sessions to the Python report page', () => {
		expect(reportUrl({ id: HEX_ID, finished_at: '2026-11-10T16:00:00Z' })).toBe(`/reports/${HEX_ID}`);
		expect(reportUrl({ id: HEX_ID, finished_at: null })).toBeNull();
		expect(reportUrl({ id: 'S1', finished_at: '2026-11-10T16:00:00Z' })).toBeNull();
	});
});

describe('convexErrorMessage', () => {
	it('strips Convex request metadata and stack frames', () => {
		const raw =
			'[CONVEX Q(archive:history)] [Request ID: bc6f] Server Error Uncaught Error: Session record is missing at handler (../convex/archive.js:91:4) Called by client';
		expect(convexErrorMessage(new Error(raw))).toBe('Convex request failed: Session record is missing');
		expect(convexErrorMessage(new Error('Uncaught Error: Invalid feedback read token at authorize'))).toBe(
			'Convex rejected the feedback read token. Check the token and connect again.'
		);
	});
});

describe('live feedback status message', () => {
	it('reports an idle connection instead of a missing publisher when no session is running', () => {
		liveFeedback.token = 'read-token';
		liveFeedback.now = 60_000;
		// The publisher stops heartbeating once a session ends, so the idle row is old.
		liveFeedback.snapshot = { updatedAt: 1_000, dashboard: null };
		expect(liveFeedback.message).toBe('Connected to Convex. No live session is running.');
		// A stale snapshot that still carries a session means the publisher stopped mid-session.
		liveFeedback.snapshot = { updatedAt: 1_000, dashboard: workout({ id: 'S1', participants: [], finished_at: null }) };
		expect(liveFeedback.message).toBe('Waiting for the laptop feedback publisher.');
		liveFeedback.now = 2_000;
		expect(liveFeedback.message).toBe('');
		liveFeedback.disconnect();
		liveFeedback.token = '';
	});
});
