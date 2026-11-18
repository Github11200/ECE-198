// Exercise names and range targets mirror backend/tracker/exercises.py.
export const exercises = [
	{ name: 'Seated right-arm curl', category: 'Strength', joint: 'Right elbow', target: '≤ 70°' },
	{ name: 'Pushups', category: 'Strength', joint: 'Right elbow', target: '≤ 90°' },
	{ name: 'Squats', category: 'Strength', joint: 'Right knee', target: '≤ 100°' },
	{ name: 'Seated knee extensions', category: 'Rehabilitation', joint: 'Right knee', target: '≥ 155°' },
	{ name: 'Seated shoulder raises', category: 'Rehabilitation', joint: 'Right shoulder', target: '≥ 80°' },
	{ name: 'Seated marches', category: 'Rehabilitation', joint: 'Right hip', target: '≤ 60°' },
	{ name: 'Sit-to-stand', category: 'Rehabilitation', joint: 'Right hip and knee', target: '≥ 155°' }
] as const;

export const sectionLinks = [
	{ href: '/#features', label: 'Features' },
	{ href: '/#how-it-works', label: 'How it works' },
	{ href: '/#live', label: 'Wearable' },
	{ href: '/#exercises', label: 'Exercises' }
] as const;
