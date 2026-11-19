// Exercise names and range targets mirror backend/tracker/exercises.py.
export const exercises = [
	{ name: 'Seated arm curl', category: 'Strength', joint: 'Elbow (either side)', target: '≤ 70°' },
	{ name: 'Pushups', category: 'Strength', joint: 'Elbow (either side)', target: '≤ 90°' },
	{ name: 'Squats', category: 'Strength', joint: 'Knee (either side)', target: '≤ 100°' },
	{ name: 'Seated knee extensions', category: 'Rehabilitation', joint: 'Knee (either side)', target: '≥ 155°' },
	{ name: 'Seated shoulder raises', category: 'Rehabilitation', joint: 'Shoulder (either side)', target: '≥ 80°' },
	{ name: 'Seated marches', category: 'Rehabilitation', joint: 'Hip (either side)', target: '≤ 60°' },
	{ name: 'Sit-to-stand', category: 'Rehabilitation', joint: 'Hip and knee (one side)', target: '≥ 155°' }
] as const;

export const sectionLinks = [
	{ href: '/#features', label: 'Features' },
	{ href: '/#how-it-works', label: 'How it works' },
	{ href: '/#live', label: 'Wearable' },
	{ href: '/#exercises', label: 'Exercises' }
] as const;
