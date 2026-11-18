<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon, Plug01Icon, Wifi01Icon, WifiDisconnected01Icon } from '@hugeicons/core-free-icons';
	import Brand from './brand.svelte';
	import ThemeToggle from './theme-toggle.svelte';
	import { Backdrop } from '#lib/components/graphics/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { tracker } from '#lib/tracker.svelte.js';
	import { liveFeedback } from '#lib/live-feedback.svelte.js';

	let tokenInput = $state('');
	let { role, children }: { role: 'admin' | 'patient'; children: Snippet } = $props();
	const connection = $derived(
		tracker.connected
			? { label: 'Tracker connected', tone: 'text-success', dot: 'bg-success', icon: Wifi01Icon }
			: tracker.loading
				? { label: 'Connecting…', tone: 'text-muted-foreground', dot: 'bg-muted-foreground/60', icon: Wifi01Icon }
				: { label: 'Reconnecting', tone: 'text-warning-foreground', dot: 'bg-warning', icon: WifiDisconnected01Icon }
	);
	const year = new Date().getFullYear();

	onMount(() => {
		void tracker.init();
		return () => tracker.destroy();
	});
</script>

<div class="flex min-h-svh flex-col bg-background text-foreground">
	<header class="sticky top-0 z-30 h-14 border-b border-border bg-background/75 backdrop-blur-md">
		<div class="page-container flex h-full items-center justify-between gap-2">
			<div class="flex min-w-0 items-center gap-2 sm:gap-3">
				<Brand compact href="/" />
				<span class="hidden h-5 w-px shrink-0 bg-border sm:block" aria-hidden="true"></span>
				<nav aria-label="Workspace" class="hidden items-center rounded-full bg-muted p-1 text-xs sm:flex sm:text-sm">
					<a href="/admin" aria-current={role === 'admin' ? 'page' : undefined} class={`rounded-full px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 ${role === 'admin' ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Instructor</a>
					<a href="/patient" aria-current={role === 'patient' ? 'page' : undefined} class={`rounded-full px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3 ${role === 'patient' ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Participant</a>
				</nav>
			</div>
			<div class="flex shrink-0 items-center gap-1 sm:gap-2">
				<Tooltip.Provider><Tooltip.Root>
					<Tooltip.Trigger class="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={connection.label}>
						<Badge variant={tracker.connected ? 'success' : tracker.loading ? 'info' : 'warning'} role="status" aria-live="polite" class="gap-1.5">
							{#if tracker.connected}<span class="relative flex size-2"><span class="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60"></span><span class="relative inline-flex size-2 rounded-full bg-current"></span></span>{:else}<HugeiconsIcon icon={connection.icon} size={14} strokeWidth={2} />{/if}
							<span class="hidden sm:inline">{tracker.connected ? 'Live' : tracker.loading ? 'Connecting' : 'Offline'}</span>
							<span class="sr-only">{connection.label}</span>
						</Badge>
					</Tooltip.Trigger>
					<Tooltip.Content>{connection.label}</Tooltip.Content>
				</Tooltip.Root></Tooltip.Provider>
				<ThemeToggle />
				<Button variant="ghost" size="sm" href="/" class="text-muted-foreground hover:text-foreground">
					<HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} data-icon="inline-start" />
					<span class="hidden sm:inline">Switch role</span><span class="sr-only sm:hidden">Switch role</span>
				</Button>
			</div>
		</div>
	</header>

	<main id="main" class="relative isolate flex-1 overflow-hidden">
		<Backdrop preset="dashboard" />
		<div class="page-container relative flex max-w-[75rem] flex-col gap-6 py-8 sm:py-10">
			{#if liveFeedback.message}
				<div role="status" class="alert-tint [--alert-color:var(--info)] flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center">
					<span class="grid size-7 shrink-0 place-items-center rounded-lg bg-[color-mix(in_oklab,var(--info)_12%,var(--card))] text-[var(--info)]"><HugeiconsIcon icon={Plug01Icon} size={16} strokeWidth={2} /></span>
					<div class="min-w-0 flex-1"><p class="font-medium">Connect cloud history</p><p class="text-muted-foreground text-xs leading-relaxed">{liveFeedback.message}</p></div>
					{#if liveFeedback.configured}<form class="flex w-full min-w-0 items-center gap-2 sm:w-auto" onsubmit={(event) => { event.preventDefault(); liveFeedback.connect(tokenInput.trim()); }}>
						<Label for="feedback-token" class="sr-only">Feedback read token</Label>
						<Input id="feedback-token" type="password" placeholder="Read token" class="h-9 min-w-0 flex-1 sm:w-44 sm:flex-none" autocomplete="off" required bind:value={tokenInput} />
						<Button type="submit" size="sm" variant="outline">Connect</Button>
					</form>{/if}
				</div>
			{/if}
			{@render children()}
		</div>
	</main>
	<footer class="border-t border-border">
		<div class="page-container flex justify-between py-5 text-xs text-muted-foreground"><span>Alder Rehabilitation</span><span>© {year}</span></div>
	</footer>
</div>
