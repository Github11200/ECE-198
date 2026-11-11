<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon, Wifi01Icon, WifiDisconnected01Icon } from '@hugeicons/core-free-icons';
	import Brand from './brand.svelte';
	import ThemeToggle from './theme-toggle.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { tracker } from '#lib/tracker.svelte.js';
	import { liveFeedback } from '#lib/live-feedback.svelte.js';

	let tokenInput = $state('');

	let { role, children }: { role: 'admin' | 'patient'; children: Snippet } = $props();

	const roleLabel = $derived(role === 'admin' ? 'Admin workspace' : 'Patient view');

	const connection = $derived(
		tracker.connected
			? { label: 'Tracker connected', tone: 'text-success', dot: 'bg-success', icon: Wifi01Icon }
			: tracker.loading
				? { label: 'Connecting…', tone: 'text-muted-foreground', dot: 'bg-muted-foreground/60', icon: Wifi01Icon }
				: { label: 'Reconnecting', tone: 'text-warning-foreground', dot: 'bg-warning', icon: WifiDisconnected01Icon }
	);

	onMount(() => {
		void tracker.init();
		return () => tracker.destroy();
	});
</script>

<div class="bg-background flex min-h-svh flex-col">
	<header class="bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-30 border-b backdrop-blur-lg">
		<div class="page-container flex h-16 items-center justify-between gap-3 sm:gap-4">
			<div class="flex min-w-0 items-center gap-3 sm:gap-4">
				<Brand compact href="/" />
				<span class="bg-border hidden h-6 w-px sm:block" aria-hidden="true"></span>
				<Badge variant="secondary" class="hidden font-semibold sm:inline-flex">{roleLabel}</Badge>
			</div>

			<div class="flex items-center gap-1 sm:gap-2">
				<p
					class={`hidden items-center gap-2 px-2 text-xs font-semibold md:inline-flex ${connection.tone}`}
					role="status"
					aria-live="polite"
				>
					<span class={`size-2 rounded-full ${connection.dot}`} aria-hidden="true"></span>
					{connection.label}
				</p>
				<ThemeToggle />
				<Button variant="ghost" size="sm" href="/" class="text-muted-foreground hover:text-foreground">
					<HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} data-icon="inline-start" />
					<span class="hidden sm:inline">Switch role</span>
					<span class="sr-only sm:hidden">Switch role</span>
				</Button>
			</div>
		</div>
	</header>

	<main id="main" class="flex-1 py-8 sm:py-10">
		<div class="page-container flex flex-col gap-8">
			{#if liveFeedback.message}
				<div class="bg-muted/50 flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" role="status">
					<span>{liveFeedback.message}</span>
					{#if liveFeedback.configured}
						<form
							class="flex items-center gap-2"
							onsubmit={(event) => {
								event.preventDefault();
								liveFeedback.connect(tokenInput.trim());
							}}
						>
							<Label for="feedback-token" class="sr-only">Feedback read token</Label>
							<Input
								id="feedback-token"
								type="password"
								class="h-9 w-48"
								autocomplete="off"
								required
								bind:value={tokenInput}
							/>
							<Button type="submit" size="sm">Connect</Button>
						</form>
					{/if}
				</div>
			{/if}
			{@render children()}
		</div>
	</main>

	<footer class="border-t">
		<div
			class="page-container text-muted-foreground flex flex-col gap-1 py-5 text-xs sm:flex-row sm:items-center sm:justify-between"
		>
			<span>CCCARE Exercise Tracker · Alder Rehabilitation</span>
		</div>
	</footer>
</div>
