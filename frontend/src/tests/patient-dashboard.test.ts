import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PatientPage from '../routes/patient/+page.svelte';
import { connectFeedback, installTrackerApi, resetTracker } from './fixtures';

vi.mock('convex/browser', async () => ({ ConvexClient: (await import('./convex-mock')).FakeConvexClient }));

function stat(label: string) {
	const labelEl = screen.getByText(label, { selector: 'p' });
	return labelEl.parentElement?.querySelector('.stat-value')?.textContent?.trim();
}

/** Each session card in the saved-sessions list, newest first. */
async function loadedSessions() {
	await waitFor(() => expect(stat('Sessions attended')).not.toBe('—'));
	const list = screen.getByRole('list', { name: 'Saved sessions' });
	return Array.from(list.children) as HTMLElement[];
}

beforeEach(() => {
	resetTracker();
});

describe('patient dashboard', () => {
	it('asks for the feedback token before showing any results', async () => {
		installTrackerApi();
		render(PatientPage);
		expect(await screen.findByRole('heading', { name: 'Connect to view saved sessions.' })).toBeInTheDocument();
		expect(stat('Sessions attended')).toBe('0');
	});

	it('shows the selected participant’s attendance, latest reps and average range score', async () => {
		installTrackerApi();
		const user = userEvent.setup();
		render(PatientPage);
		await connectFeedback(user);

		await waitFor(() => expect(stat('Sessions attended')).toBe('2'));
		expect(stat('Latest reps')).toBe('8 / 10');
		expect(stat('Average range score')).toBe('88%');
		expect(screen.getByLabelText('Viewing as')).toHaveValue('P01');
	});

	it('offers every participant ID from P01 to P99, as the original portal did', async () => {
		installTrackerApi();
		render(PatientPage);
		const options = within(screen.getByLabelText('Viewing as')).getAllByRole('option');
		expect(options).toHaveLength(99);
		expect(options[0]).toHaveValue('P01');
		expect(options[98]).toHaveValue('P99');
	});

	it('lists each saved session with reps, metrics and instructor notes, newest first', async () => {
		installTrackerApi();
		const user = userEvent.setup();
		render(PatientPage);
		await connectFeedback(user);

		const items = await loadedSessions();
		expect(items).toHaveLength(2);

		const latest = items[0];
		expect(within(latest).getByText('Seated arm curl · Station 1')).toBeInTheDocument();
		expect(within(latest).getByText('8 / 10')).toBeInTheDocument();
		expect(within(latest).getByText('Two attempts stopped short of the angle target.')).toBeInTheDocument();
		expect(within(latest).getByText('92%')).toBeInTheDocument();

		expect(within(items[1]).getByText('Sit to stand · Station 1')).toBeInTheDocument();
	});

	it('switches to another participant and updates every figure', async () => {
		installTrackerApi();
		const user = userEvent.setup();
		render(PatientPage);
		await connectFeedback(user);
		await loadedSessions();

		await user.selectOptions(screen.getByLabelText('Viewing as'), 'P02');

		await waitFor(() => expect(stat('Sessions attended')).toBe('1'));
		expect(stat('Latest reps')).toBe('6 / 8');
		expect(stat('Average range score')).toBe('100%');
		expect(screen.getByText('No review notes so far')).toBeInTheDocument();
		expect(screen.queryByText('Two attempts stopped short of the angle target.')).not.toBeInTheDocument();
	});

	it('explains the empty state for a participant with no saved sessions', async () => {
		installTrackerApi();
		const user = userEvent.setup();
		render(PatientPage);
		await connectFeedback(user);
		await loadedSessions();

		await user.selectOptions(screen.getByLabelText('Viewing as'), 'P04');

		expect(await screen.findByRole('heading', { name: 'No sessions recorded for P04 yet.' })).toBeInTheDocument();
		expect(stat('Sessions attended')).toBe('0');
		expect(stat('Latest reps')).toBe('—');
		expect(stat('Average range score')).toBe('—');
	});

	it('reports when the archive cannot be read', async () => {
		installTrackerApi({ archiveError: 'Convex is unreachable.' });
		const user = userEvent.setup();
		render(PatientPage);
		await connectFeedback(user);

		expect(await screen.findByRole('alert')).toHaveTextContent('Results unavailable');
		expect(screen.getByRole('alert')).toHaveTextContent('Convex is unreachable.');
	});
});
