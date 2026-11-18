import { dev } from '$app/env';
import { error } from '@sveltejs/kit';

// The root layout is prerendered for the static tracker export.
export const prerender = false;
export const ssr = false;

export const load = () => {
	if (!dev) error(404, 'Not found');
};
