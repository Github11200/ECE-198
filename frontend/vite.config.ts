import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
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
	server: {
		proxy: {
			'/api': 'http://127.0.0.1:8000',
			'/reports': 'http://127.0.0.1:8000'
		}
	}
});
