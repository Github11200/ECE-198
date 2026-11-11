import { describe, expect, it } from 'vitest';
import {
	buildRoster,
	filterRoster,
	patientIds,
	patientSessions,
	patientSummary,
	validateLanes
} from '#lib/dashboard.js';
import { liveWorkout, person, savedHistory, workout } from './fixtures';

describe('buildRoster', () => {
	it('lists the default IDs and every ID that appears in saved or live sessions, sorted', () => {
		const roster = buildRoster(savedHistory, null);
		expect(roster.map((entry) => entry.id)).toEqual(['P01', 'P02', 'P03', 'P04', 'P05']);

		const withExtra = buildRoster(
			savedHistory,
			workout({ id: 'LIVE', participants: [person({ id: 'P09', lane: 1 })] })
		);
		expect(withExtra.map((entry) => entry.id)).toContain('P09');
	});

	it('counts saved visits per participant and uses the newest saved result', () => {
		const p01 = buildRoster(savedHistory, null).find((entry) => entry.id === 'P01');
		expect(p01?.visits).toBe(2);
		expect(p01?.result?.reps).toBe(8);
		expect(p01?.workout?.id).toBe('S2');
		expect(p01?.live).toBe(false);
	});

	it('prefers the live result and marks the row as live', () => {
		const p03 = buildRoster(savedHistory, liveWorkout).find((entry) => entry.id === 'P03');
		expect(p03?.live).toBe(true);
		expect(p03?.workout?.id).toBe('LIVE');
		expect(p03?.result?.reps).toBe(3);
	});

	it('flags saved results with notes and live lanes without a clear view or with short attempts', () => {
		const roster = buildRoster(savedHistory, liveWorkout);
		expect(roster.find((entry) => entry.id === 'P01')?.needsReview).toBe(true);
		expect(roster.find((entry) => entry.id === 'P02')?.needsReview).toBe(false);
		// P03 is live with a usable angle and no short attempts yet.
		expect(roster.find((entry) => entry.id === 'P03')?.needsReview).toBe(false);
		// P04 has no clear view, so the instructor should check it.
		expect(roster.find((entry) => entry.id === 'P04')?.needsReview).toBe(true);
		expect(roster.find((entry) => entry.id === 'P04')?.status.label).toBe('No clear view');
	});

	it('leaves never-tested default participants in the ready-for-setup state', () => {
		const p05 = buildRoster(savedHistory, null).find((entry) => entry.id === 'P05');
		expect(p05?.result).toBeUndefined();
		expect(p05?.visits).toBe(0);
		expect(p05?.status).toEqual({ label: 'Ready for setup', tone: 'neutral' });
	});
});

describe('filterRoster', () => {
	const roster = buildRoster(savedHistory, liveWorkout);

	it('matches the ID or the "Participant NN" label, ignoring case and spacing', () => {
		expect(filterRoster(roster, 'p02', 'all').map((e) => e.id)).toEqual(['P02']);
		expect(filterRoster(roster, '  participant 03 ', 'all').map((e) => e.id)).toEqual(['P03']);
	});

	it('keeps only participants that need review when the review filter is set', () => {
		expect(filterRoster(roster, '', 'review').map((e) => e.id)).toEqual(['P01', 'P04']);
	});

	it('combines search and review filters', () => {
		expect(filterRoster(roster, 'P02', 'review')).toEqual([]);
	});

	it('returns every row for an empty search with the all filter', () => {
		expect(filterRoster(roster, '', 'all')).toHaveLength(roster.length);
	});
});

describe('validateLanes', () => {
	it('accepts a unique, in-range lane setup', () => {
		expect(
			validateLanes(
				[
					{ id: 'P01', target: 10 },
					{ id: 'P12', target: 99 }
				],
				5
			)
		).toBeNull();
	});

	it('rejects an empty setup and more lanes than the tracker allows', () => {
		expect(validateLanes([], 5)).toBe('Add at least one camera lane.');
		expect(validateLanes(Array.from({ length: 6 }, (_, i) => ({ id: `P0${i + 1}`, target: 5 })), 5)).toBe(
			'Use up to 5 camera lanes.'
		);
	});

	it('rejects IDs outside P01–P99', () => {
		expect(validateLanes([{ id: 'P00', target: 5 }], 5)).toBe('Lane 1 needs an ID from P01 to P99.');
		expect(validateLanes([{ id: 'X1', target: 5 }], 5)).toBe('Lane 1 needs an ID from P01 to P99.');
		expect(validateLanes([{ id: 'P100', target: 5 }], 5)).toBe('Lane 1 needs an ID from P01 to P99.');
	});

	it('rejects duplicate IDs', () => {
		expect(
			validateLanes(
				[
					{ id: 'P01', target: 5 },
					{ id: 'P01', target: 6 }
				],
				5
			)
		).toBe('Assign a different participant ID to each lane.');
	});

	it('rejects missing, fractional and out-of-range rep targets', () => {
		const message = (target: number) => validateLanes([{ id: 'P01', target }], 5);
		expect(message(Number.NaN)).toBe('Lane 1 needs a rep target from 1 to 99.');
		expect(message(0)).toBe('Lane 1 needs a rep target from 1 to 99.');
		expect(message(100)).toBe('Lane 1 needs a rep target from 1 to 99.');
		expect(message(2.5)).toBe('Lane 1 needs a rep target from 1 to 99.');
	});
});

describe('patient view helpers', () => {
	it('returns only sessions that include the participant, newest first', () => {
		expect(patientSessions(savedHistory, 'P01').map((row) => row.session.id)).toEqual(['S2', 'S1']);
		expect(patientSessions(savedHistory, 'P02').map((row) => row.session.id)).toEqual(['S2']);
		expect(patientSessions(savedHistory, 'P05')).toEqual([]);
	});

	it('lists default IDs together with any ID that has saved sessions', () => {
		const ids = patientIds([workout({ id: 'X', participants: [person({ id: 'P08', lane: 1 })] })]);
		expect(ids).toEqual(['P01', 'P02', 'P03', 'P04', 'P05', 'P08']);
	});

	it('summarises attendance, latest reps and average range score', () => {
		const summary = patientSummary(patientSessions(savedHistory, 'P01'));
		expect(summary).toEqual({
			attended: 2,
			averageRange: 88,
			latestReps: 8,
			latestTarget: 10,
			notes: 1
		});
	});

	it('returns empty values when there are no sessions', () => {
		expect(patientSummary([])).toEqual({
			attended: 0,
			averageRange: null,
			latestReps: null,
			latestTarget: null,
			notes: 0
		});
	});

	it('ignores sessions without a recorded range score when averaging', () => {
		const rows = [
			{ session: savedHistory[0], person: person({ id: 'P01', lane: 1, range_score: null }) },
			{ session: savedHistory[1], person: person({ id: 'P01', lane: 1, range_score: 70 }) }
		];
		expect(patientSummary(rows).averageRange).toBe(70);
	});
});
