<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import './layout.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href="/icon.svg" />
	<meta name="theme-color" content="#2e5a49" />
</svelte:head>

<ModeWatcher defaultMode="light" />
<a class="skip-link" href="#main">Skip to content</a>
{@render children()}
<Toaster position="bottom-right" richColors closeButton />
