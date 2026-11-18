<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Container } from '#lib/components/ui/container/index.js';
	import { Backdrop } from '#lib/components/graphics/index.js';
	import HeroDemo from './hero-demo.svelte';

	let { variant }: { variant: 'rehabilitation' | 'cancer' } = $props();
</script>

<section aria-labelledby="programme-title" class="relative isolate overflow-hidden py-20 md:py-28">
	<Backdrop preset="section" />
	<Container class="relative grid min-w-0 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
		<div class="min-w-0 max-w-xl">
			<p class="inline-flex max-w-full items-center rounded-full border border-border bg-card/70 px-3.5 py-1.5 font-mono text-[10px] tracking-wide text-foreground shadow-[var(--shadow-xs)] backdrop-blur sm:text-xs">
				{variant === 'cancer' ? 'Cancer exercise programme' : 'Rehabilitation programme'}
			</p>
			<h1 id="programme-title" class="text-display mt-6 max-w-xl text-balance">
				{#if variant === 'cancer'}
					Exercise through treatment, <span class="font-serif-accent">tracked</span> gently.
				{:else}
					Supervised rehab, <span class="font-serif-accent">measured</span> every session.
				{/if}
			</h1>
			<p class="text-lead mt-6 max-w-lg">
				{#if variant === 'cancer'}
					Chair-based and strength movements with per-person targets, live range cues and a record participants can review.
				{:else}
					Set a target for each participant, follow range cues live, and leave with a report you can print.
				{/if}
			</p>
			<div class="mt-8 flex flex-wrap items-center gap-3">
				<Button variant="hero" size="xl" href="/admin/">Start a session</Button>
				<Button variant="outline" size="xl" href="/patient/">View my sessions</Button>
			</div>
		</div>
		<HeroDemo still />
	</Container>
</section>
