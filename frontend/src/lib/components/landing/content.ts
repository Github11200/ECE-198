/**
 * Copy and reference data for the home page.
 * Exercise criteria mirror backend/tracker/exercises.py (fixed demonstration
 * criteria, not individual prescriptions). Update both together.
 */

export const sectionLinks = [
	{ href: '#workflow', label: 'Workflow' },
	{ href: '#exercises', label: 'Exercises' },
	{ href: '#about', label: 'About' }
] as const;

export const workflow = [
	{
		title: 'Set up the group',
		text: 'Choose an exercise, assign participant IDs to camera lanes, and set a rep target for each person.'
	},
	{
		title: 'Monitor the session',
		text: 'Follow individual rep counts, range cues, and tracking availability while participants exercise.'
	},
	{
		title: 'Save and review',
		text: 'End the session to save each participant’s results. Review short attempts, tracking notes, and the workout report.'
	}
] as const;

export type Exercise = { name: string; measure: string; target: string };

export const exerciseGroups: { title: string; note: string; items: Exercise[] }[] = [
	{
		title: 'Strength',
		note: 'Side view, right side of the body visible.',
		items: [
			{ name: 'Seated right-arm curl', measure: 'Right elbow', target: '≤ 70°' },
			{ name: 'Pushups', measure: 'Right elbow', target: '≤ 90°' },
			{ name: 'Squats', measure: 'Right knee', target: '≤ 100°' }
		]
	},
	{
		title: 'Chair-based movements',
		note: 'Seated or from a chair, counting the right side.',
		items: [
			{ name: 'Seated knee extensions', measure: 'Right knee', target: '≥ 155°' },
			{ name: 'Seated shoulder raises', measure: 'Right shoulder', target: '≥ 80°' },
			{ name: 'Seated marches', measure: 'Right hip', target: '≤ 60°' },
			{ name: 'Sit-to-stand', measure: 'Right hip and knee', target: '≥ 155°' }
		]
	}
];

export const savedResults =
	'Reps completed, range target reached, tracking coverage, and per-participant review notes.';
