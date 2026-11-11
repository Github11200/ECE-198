import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// Svelte components resolve their browser build under Vitest (jsdom).
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
	envPrefix: ['PUBLIC_', 'VITE_'],
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// The Python tracker serves the static export from frontend/out.
			adapter: adapter({ pages: 'out', assets: 'out', strict: true })
		})
	],
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		setupFiles: ['src/tests/setup.ts'],
		env: { TZ: 'America/Toronto', PUBLIC_CONVEX_URL: 'https://example.convex.cloud' }
	},
	server: {
		proxy: {
			'/api': 'http://127.0.0.1:8000',
			'/reports': 'http://127.0.0.1:8000'
		}
	}
});
