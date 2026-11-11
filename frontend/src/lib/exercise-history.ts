export type ExerciseId = 'curl' | 'stand' | 'heel';

export type ExerciseResult = {
	exerciseId: ExerciseId;
	reps: number;
	target: number;
	score: number;
};

export type ExerciseSession = {
	id: string;
	name: string;
	time: string;
	minutes: number;
	location: 'In clinic' | 'At home';
	exercises: ExerciseResult[];
};

export type ExerciseDay = {
	date: string;
	sessions: ExerciseSession[];
};

export const exerciseNames: Record<ExerciseId, string> = {
	curl: 'Seated arm curl',
	stand: 'Sit to stand',
	heel: 'Supported heel raise'
};

// Prepared demonstration records, newest day first. Sessions within a day
// are in time order. Scores are illustrative and are not derived from reps.
export const exerciseHistory: ExerciseDay[] = [
	{
		date: '2026-11-06',
		sessions: [
			{
				id: 'P01-1106-AM',
				name: 'Morning movement',
				time: '10:30 AM',
				minutes: 35,
				location: 'In clinic',
				exercises: [
					{ exerciseId: 'curl', reps: 8, target: 10, score: 88 },
					{ exerciseId: 'stand', reps: 6, target: 6, score: 74 },
					{ exerciseId: 'heel', reps: 8, target: 8, score: 57 }
				]
			},
			{
				id: 'P01-1106-PM',
				name: 'Afternoon practice',
				time: '3:00 PM',
				minutes: 15,
				location: 'At home',
				exercises: [
					{ exerciseId: 'stand', reps: 6, target: 6, score: 83 },
					{ exerciseId: 'heel', reps: 8, target: 8, score: 76 }
				]
			}
		]
	},
	{
		date: '2026-11-04',
		sessions: [
			{
				id: 'P01-1104-AM',
				name: 'Morning movement',
				time: '10:30 AM',
				minutes: 30,
				location: 'In clinic',
				exercises: [
					{ exerciseId: 'curl', reps: 7, target: 10, score: 76 },
					{ exerciseId: 'stand', reps: 5, target: 6, score: 62 },
					{ exerciseId: 'heel', reps: 6, target: 8, score: 43 }
				]
			}
		]
	},
	{
		date: '2026-11-02',
		sessions: [
			{
				id: 'P01-1102-AM',
				name: 'Morning movement',
				time: '10:30 AM',
				minutes: 30,
				location: 'In clinic',
				exercises: [
					{ exerciseId: 'curl', reps: 6, target: 8, score: 61 },
					{ exerciseId: 'stand', reps: 4, target: 6, score: 53 },
					{ exerciseId: 'heel', reps: 5, target: 8, score: 36 }
				]
			},
			{
				id: 'P01-1102-PM',
				name: 'Afternoon practice',
				time: '3:00 PM',
				minutes: 15,
				location: 'At home',
				exercises: [
					{ exerciseId: 'curl', reps: 6, target: 8, score: 68 },
					{ exerciseId: 'heel', reps: 6, target: 8, score: 47 }
				]
			}
		]
	},
	{
		date: '2026-10-30',
		sessions: [
			{
				id: 'P01-1030-AM',
				name: 'Morning movement',
				time: '10:30 AM',
				minutes: 25,
				location: 'In clinic',
				exercises: [
					{ exerciseId: 'curl', reps: 6, target: 8, score: 44 },
					{ exerciseId: 'stand', reps: 4, target: 6, score: 38 },
					{ exerciseId: 'heel', reps: 5, target: 8, score: 25 }
				]
			}
		]
	},
	{
		date: '2026-10-28',
		sessions: [
			{
				id: 'P01-1028-AM',
				name: 'Morning movement',
				time: '10:30 AM',
				minutes: 25,
				location: 'In clinic',
				exercises: [
					{ exerciseId: 'curl', reps: 4, target: 8, score: 32 },
					{ exerciseId: 'stand', reps: 2, target: 6, score: 18 },
					{ exerciseId: 'heel', reps: 5, target: 8, score: 41 }
				]
			}
		]
	},
	{
		date: '2026-10-26',
		sessions: [
			{
				id: 'P01-1026-AM',
				name: 'Programme introduction',
				time: '10:30 AM',
				minutes: 20,
				location: 'In clinic',
				exercises: [
					{ exerciseId: 'curl', reps: 2, target: 8, score: 12 },
					{ exerciseId: 'stand', reps: 3, target: 6, score: 24 },
					{ exerciseId: 'heel', reps: 3, target: 8, score: 18 }
				]
			}
		]
	}
];

export const scoreBands = [
	{ name: 'blue', label: 'Excellent', min: 80, max: 100, colour: '#2563eb', tint: '#dbeafe' },
	{ name: 'green', label: 'Strong', min: 60, max: 79, colour: '#15803d', tint: '#dcfce7' },
	{ name: 'yellow', label: 'Steady', min: 40, max: 59, colour: '#a16207', tint: '#fef3c7' },
	{ name: 'orange', label: 'Building', min: 20, max: 39, colour: '#c2410c', tint: '#ffedd5' },
	{ name: 'red', label: 'Needs support', min: 0, max: 19, colour: '#b91c1c', tint: '#fee2e2' }
] as const;

export function scoreBand(score: number) {
	if (!Number.isInteger(score) || score < 0 || score > 100) {
		throw new RangeError('Demo scores must be whole numbers from 0 to 100.');
	}
	return scoreBands.find((band) => score >= band.min)!;
}

export function averageScore(results: ExerciseResult[]) {
	return Math.round(results.reduce((total, result) => total + result.score, 0) / results.length);
}

export function dayScore(day: ExerciseDay) {
	return averageScore(day.sessions.flatMap((session) => session.exercises));
}

export function latestExerciseResult(exerciseId: string) {
	for (const day of exerciseHistory) {
		for (const session of [...day.sessions].reverse()) {
			const result = session.exercises.find((exercise) => exercise.exerciseId === exerciseId);
			if (result) return result;
		}
	}
	return undefined;
}

export const recordedSessionCount = exerciseHistory.reduce(
	(total, day) => total + day.sessions.length,
	0
);
export const latestSession = exerciseHistory[0].sessions.at(-1)!;

export function historyDate(date: string, short = false) {
	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: short ? 'short' : 'long',
		...(short ? {} : { weekday: 'long', year: 'numeric' }),
		timeZone: 'UTC'
	}).format(new Date(`${date}T12:00:00Z`));
}
