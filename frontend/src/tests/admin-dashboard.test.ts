import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from '../routes/admin/+page.svelte';
import { connectFeedback, installTrackerApi, liveWorkout, resetTracker, type ApiCall } from './fixtures';

vi.mock('convex/browser', async () => ({ ConvexClient: (await import('./convex-mock')).FakeConvexClient }));

/** Reads the big number shown in a StatCard, identified by its label. */
function stat(label: string) {
	const labelEl = screen.getByText(label, { selector: 'p' });
	return labelEl.parentElement?.querySelector('.stat-value')?.textContent?.trim();
}

async function loadedRoster() {
	return screen.findByRole('table', { name: 'Participants' });
}

/** Opens the admin dashboard and connects the Convex feedback, as a team member would. */
async function openAdmin() {
	const user = userEvent.setup();
	render(AdminPage);
	await connectFeedback(user);
	await loadedRoster();
	await waitFor(() => expect(stat('Saved sessions')).toBe('2'));
	return user;
}

function rowFor(table: HTMLElement, name: string) {
	return within(table).getByText(name).closest('tr') as HTMLElement;
}

function postsTo(calls: ApiCall[], path: string) {
	return calls.filter((call) => call.method === 'POST' && call.path === path);
}

beforeEach(() => {
	resetTracker();
});

describe('admin dashboard: summary and roster', () => {
	it('shows the roster counts and every participant from saved sessions and the default roster', async () => {
		installTrackerApi();
		await openAdmin();

		const table = await loadedRoster();
		// Header row plus P01–P05.
		expect(within(table).getAllByRole('row')).toHaveLength(6);
		for (const name of ['Participant 01', 'Participant 02', 'Participant 03', 'Participant 04', 'Participant 05']) {
			expect(within(table).getByText(name)).toBeInTheDocument();
		}
		expect(stat('Participant IDs')).toBe('5');
		expect(stat('Review needed')).toBe('1');
	});

	it('shows the latest saved result and its status for each participant', async () => {
		installTrackerApi();
		await openAdmin();
		const table = await loadedRoster();

		const p01 = rowFor(table, 'Participant 01');
		expect(within(p01).getByText('8')).toBeInTheDocument();
		expect(within(p01).getByText('Review notes')).toBeInTheDocument();
		expect(within(p01).getByText('75%')).toBeInTheDocument();

		expect(within(rowFor(table, 'Participant 02')).getByText('Target met')).toBeInTheDocument();
	});

	it('narrows the roster with the review filter', async () => {
		installTrackerApi();
		const user = await openAdmin();
		const table = await loadedRoster();

		await user.selectOptions(screen.getByLabelText('Filter participants'), 'review');

		expect(within(table).getByText('Participant 01')).toBeInTheDocument();
		expect(within(table).queryByText('Participant 02')).not.toBeInTheDocument();
		expect(screen.getByText('Showing 1 of 5 IDs · IDs stay with participants across sessions')).toBeInTheDocument();
	});

	it('searches by participant ID and offers a way back when nothing matches', async () => {
		installTrackerApi();
		const user = await openAdmin();

		const search = screen.getByLabelText('Search participants');
		await user.type(search, 'p04');
		const table = await loadedRoster();
		expect(within(table).getByText('Participant 04')).toBeInTheDocument();
		expect(within(table).queryByText('Participant 01')).not.toBeInTheDocument();

		await user.clear(search);
		await user.type(search, 'P99');
		expect(screen.getByText('No participants match this search.')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Clear filters' }));
		expect((await loadedRoster()).querySelectorAll('tbody tr')).toHaveLength(5);
	});

	it('renders a skeleton instead of an empty table while the tracker is still loading', () => {
		installTrackerApi();
		render(AdminPage);
		expect(screen.getByRole('status', { name: 'Loading participants' })).toBeInTheDocument();
	});
});

describe('admin dashboard: live connection', () => {
	it('asks for the feedback token before any archive or live data is shown', async () => {
		installTrackerApi();
		render(AdminPage);
		expect(await screen.findByText("Enter the team's feedback read token to connect to live Convex feedback.")).toBeInTheDocument();
		expect(stat('Saved sessions')).toBe('0');
	});

	it('reports a rejected token', async () => {
		installTrackerApi();
		const user = userEvent.setup();
		render(AdminPage);
		await user.type(await screen.findByLabelText('Feedback read token'), 'wrong');
		await user.click(screen.getByRole('button', { name: 'Connect' }));
		// The original page showed the live error in both the connection notice and the page alert.
		expect((await screen.findAllByText('Invalid feedback read token.')).length).toBeGreaterThan(0);
	});
});

describe('admin dashboard: participant details and targets', () => {
	it('opens participant details with measurement notes and saves the next-session target', async () => {
		installTrackerApi();
		const user = await openAdmin();

		await user.click(screen.getByRole('button', { name: 'View P01' }));
		const dialog = await screen.findByRole('dialog', { name: 'Participant 01' });
		expect(within(dialog).getByText('Two attempts stopped short of the angle target.')).toBeInTheDocument();

		const target = within(dialog).getByLabelText('Next session rep target');
		await user.clear(target);
		await user.type(target, '12');
		await user.click(within(dialog).getByRole('button', { name: 'Use target' }));

		await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Participant 01' })).not.toBeInTheDocument());
		expect(screen.getByText('P01 next session target set to 12.')).toBeInTheDocument();
	});

	it('rejects a target outside 1–99 without closing the dialog', async () => {
		installTrackerApi();
		const user = await openAdmin();

		await user.click(screen.getByRole('button', { name: 'View P02' }));
		const dialog = await screen.findByRole('dialog', { name: 'Participant 02' });
		const target = within(dialog).getByLabelText('Next session rep target');
		await user.clear(target);
		await user.type(target, '150');
		await user.click(within(dialog).getByRole('button', { name: 'Use target' }));

		expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter a whole number from 1 to 99.');
		expect(screen.getByRole('dialog', { name: 'Participant 02' })).toBeInTheDocument();
	});
});

describe('admin dashboard: starting a session', () => {
	it('blocks setup with a duplicate participant ID and sends nothing to the tracker', async () => {
		const api = installTrackerApi();
		const user = await openAdmin();

		await user.click(screen.getByRole('button', { name: 'Prepare a session' }));
		const dialog = await screen.findByRole('dialog', { name: 'Prepare a group session' });
		const laneTwo = within(dialog).getAllByLabelText('Participant ID')[1];
		await user.clear(laneTwo);
		await user.type(laneTwo, 'P01');
		await user.click(within(dialog).getByRole('button', { name: 'Start session' }));

		expect(within(dialog).getByRole('alert')).toHaveTextContent('Assign a different participant ID to each lane.');
		expect(postsTo(api.calls, '/api/session/start')).toHaveLength(0);
	});

	it('uses the saved next-session target when preparing lanes', async () => {
		installTrackerApi();
		const user = await openAdmin();

		await user.click(screen.getByRole('button', { name: 'View P01' }));
		const details = await screen.findByRole('dialog', { name: 'Participant 01' });
		const target = within(details).getByLabelText('Next session rep target');
		await user.clear(target);
		await user.type(target, '12');
		await user.click(within(details).getByRole('button', { name: 'Use target' }));
		await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Participant 01' })).not.toBeInTheDocument());

		await user.click(screen.getByRole('button', { name: 'Prepare a session' }));
		const setup = await screen.findByRole('dialog', { name: 'Prepare a group session' });
		expect(within(setup).getAllByLabelText('Rep target')[0]).toHaveValue(12);
	});

	it('starts a session with the chosen exercise, lanes and targets, then shows it in the live monitor', async () => {
		const api = installTrackerApi();
		const user = await openAdmin();

		await user.click(screen.getByRole('button', { name: 'Prepare a session' }));
		const setup = await screen.findByRole('dialog', { name: 'Prepare a group session' });
		await user.selectOptions(within(setup).getByLabelText('Exercise'), 'stand');
		await user.clear(within(setup).getByLabelText('Station'));
		await user.type(within(setup).getByLabelText('Station'), 'Room B');
		await user.click(within(setup).getByRole('button', { name: 'Start session' }));

		await waitFor(() => expect(postsTo(api.calls, '/api/session/start')).toHaveLength(1));
		expect(postsTo(api.calls, '/api/session/start')[0].body).toEqual({
			source: 'camera',
			exercise: 'stand',
			station: 'Room B',
			participant_ids: ['P01', 'P02', 'P03'],
			targets: [10, 10, 10]
		});

		expect(await screen.findByRole('dialog', { name: 'Sit to stand · Room B' })).toBeInTheDocument();
		expect(screen.getByText('Sit to stand session started for 3 participants.')).toBeInTheDocument();
	});

	it('shows the tracker error when the session cannot start', async () => {
		installTrackerApi({ startError: 'Another session is already running.' });
		const user = await openAdmin();

		await user.click(screen.getByRole('button', { name: 'Prepare a session' }));
		const setup = await screen.findByRole('dialog', { name: 'Prepare a group session' });
		await user.click(within(setup).getByRole('button', { name: 'Start session' }));

		expect(await within(setup).findByRole('alert')).toHaveTextContent('Another session is already running.');
	});

	it('disables session preparation while the Python tracker is unreachable and reports the problem', async () => {
		installTrackerApi({ unavailable: true });
		render(AdminPage);

		expect(await screen.findByRole('alert')).toHaveTextContent('Tracker unavailable');
		expect(screen.getByRole('button', { name: 'Prepare a session' })).toBeDisabled();
	});
});

describe('admin dashboard: live monitor and saving', () => {
	it('shows the active session banner and feedback for the selected lane', async () => {
		installTrackerApi({ live: liveWorkout });
		const user = await openAdmin();

		expect(await screen.findByText('Active session')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'View live session' }));

		const monitor = await screen.findByRole('dialog', { name: 'Seated arm curl · Station 1' });
		const feedback = within(monitor).getByLabelText('Participant feedback');
		expect(within(feedback).getByText('84°')).toBeInTheDocument();
		expect(within(feedback).getByText('Lower slowly to reach the range.')).toBeInTheDocument();

		await user.click(within(monitor).getByRole('button', { name: /P04/ }));
		expect(within(feedback).getByText('—')).toBeInTheDocument();
		expect(within(feedback).getByText('Waiting for a clear view of the arm.')).toBeInTheDocument();
	});

	it('ends and saves the session, shows its summary and reports that upload is pending', async () => {
		const api = installTrackerApi({ live: liveWorkout });
		const user = await openAdmin();

		await user.click(await screen.findByRole('button', { name: 'View live session' }));
		const monitor = await screen.findByRole('dialog', { name: 'Seated arm curl · Station 1' });
		await user.click(within(monitor).getByRole('button', { name: 'End & save session' }));

		await waitFor(() => expect(postsTo(api.calls, '/api/session/finish')).toHaveLength(1));
		expect(postsTo(api.calls, '/api/session/finish')[0].body).toEqual({ session_id: 'LIVE' });

		expect(await screen.findByRole('dialog', { name: 'Session summary' })).toBeInTheDocument();
		expect(
			screen.getByText(
				'Session stopped and queued for upload. It will appear in history when Convex confirms the save.'
			)
		).toBeInTheDocument();
		await waitFor(() => expect(screen.queryByText('Active session')).not.toBeInTheDocument());
	});

	it('keeps the monitor open and shows an error when saving fails', async () => {
		const api = installTrackerApi({ live: liveWorkout, finishError: 'Disk is full.' });
		const user = await openAdmin();

		await user.click(await screen.findByRole('button', { name: 'View live session' }));
		const monitor = await screen.findByRole('dialog', { name: 'Seated arm curl · Station 1' });
		await user.click(within(monitor).getByRole('button', { name: 'End & save session' }));

		expect(await screen.findByText('Disk is full.')).toBeInTheDocument();
		expect(screen.getByRole('dialog', { name: 'Seated arm curl · Station 1' })).toBeInTheDocument();
		expect(postsTo(api.calls, '/api/session/finish')).toHaveLength(1);
	});
});

describe('admin dashboard: session history', () => {
	it('filters completed sessions by participant and opens a summary', async () => {
		installTrackerApi();
		const user = await openAdmin();

		await user.click(screen.getByRole('tab', { name: 'Session history' }));
		const history = await screen.findByRole('table', { name: 'Completed sessions' });
		expect(within(history).getAllByRole('row')).toHaveLength(3);

		await user.selectOptions(screen.getByLabelText('Filter sessions by participant'), 'P02');
		expect(within(history).getAllByRole('row')).toHaveLength(2);
		expect(within(history).getByText('Seated arm curl')).toBeInTheDocument();
		expect(within(history).queryByText('Sit to stand')).not.toBeInTheDocument();

		await user.click(within(history).getByRole('button', { name: /View summary for Seated arm curl/ }));
		const summary = await screen.findByRole('dialog', { name: 'Session summary' });
		expect(within(summary).getByRole('table')).toBeInTheDocument();
		expect(within(summary).getByText('Completed / prescribed reps')).toBeInTheDocument();
	});

	it('explains when there are no completed sessions yet', async () => {
		installTrackerApi({ history: [] });
		const user = userEvent.setup();
		render(AdminPage);
		await connectFeedback(user);

		await user.click(await screen.findByRole('tab', { name: 'Session history' }));
		expect(await screen.findByText('No completed sessions yet.')).toBeInTheDocument();
	});
});
