import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import type { ProxyOptions } from 'vite';

type ProxyServer = Parameters<NonNullable<ProxyOptions['configure']>>[0];

// Override with TRACKER_URL=http://127.0.0.1:8802 npm run dev to use another tracker port.
const TRACKER = process.env.TRACKER_URL ?? 'http://127.0.0.1:8000';

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
		// The tracker only accepts Host 127.0.0.1:<port>/localhost:<port> and rejects
		// POSTs whose Origin is not itself, so present each request as same-origin.
		proxy: Object.fromEntries(
			['/api', '/reports'].map((path) => [
				path,
				{
					target: TRACKER,
					changeOrigin: true,
					configure: (proxy: ProxyServer) => {
						proxy.on('proxyReq', (proxyReq) => {
							if (proxyReq.getHeader('origin')) proxyReq.setHeader('origin', TRACKER);
						});
					}
				}
			])
		)
	}
});
