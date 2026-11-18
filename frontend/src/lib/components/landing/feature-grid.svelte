<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Container } from '#lib/components/ui/container/index.js';
	import SectionHeading from './section-heading.svelte';
</script>

{#snippet heading()}Built for every <span class="font-serif-accent">rep</span>.{/snippet}
<section id="features" aria-labelledby="features-title" class="relative isolate scroll-mt-14 overflow-hidden py-20 md:py-28">
	<Container>
		<SectionHeading id="features-title" eyebrow="Features" title={heading} description="Set individual targets, follow movement live, and keep a record of every session." />
		<div class="mt-10 grid gap-4 md:grid-cols-3">
			<Card.Root variant="feature" class="min-w-0 transition-transform motion-safe:hover:-translate-y-0.5">
				<Card.Content class="space-y-5">
					<div class="surface-inset flex h-36 flex-col justify-center gap-2 rounded-xl p-3">
						{#each ['P01', 'P02', 'P03'] as id, i}
							<div class="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-[10px] shadow-[var(--shadow-xs)]"><span class="font-mono font-medium">{id}</span><span class="text-muted-foreground">{[12, 10, 8][i]} reps</span><span class="flex gap-1 font-mono"><span class="rounded border border-border px-1">−</span><span class="rounded border border-border px-1">+</span></span></div>
						{/each}
					</div>
					<div><h3 class="text-title">Per-person targets</h3><p class="mt-2 text-sm text-muted-foreground">Set a rep goal for every numbered lane.</p></div>
				</Card.Content>
			</Card.Root>
			<Card.Root variant="feature" class="min-w-0 transition-transform motion-safe:hover:-translate-y-0.5">
				<Card.Content class="space-y-5">
					<div class="surface-inset flex h-36 items-center justify-between gap-2 rounded-xl p-4">
						<div class="relative size-24 shrink-0"><svg viewBox="0 0 100 100" class="size-full text-primary" fill="none" aria-hidden="true"><path d="M15 78 A43 43 0 0 1 85 78" stroke="var(--border-strong)" stroke-width="7" stroke-linecap="round" /><path d="M15 78 A43 43 0 0 1 73 39" stroke="currentColor" stroke-width="7" stroke-linecap="round" /><path d="M50 75 L73 39" stroke="currentColor" stroke-width="2" /><circle cx="50" cy="75" r="4" fill="currentColor" /></svg></div>
						<div class="min-w-0 text-right"><p class="font-mono text-xl font-semibold tabular-nums">152°</p><p class="font-mono text-[9px] text-muted-foreground">target ≥ 155°</p><div class="mt-2 flex flex-wrap justify-end gap-1"><Badge variant="warning" class="h-5 px-1.5 text-[9px]">Short</Badge><Badge variant="success" class="h-5 px-1.5 text-[9px]">In range</Badge></div></div>
					</div>
					<div><h3 class="text-title">Live range cues</h3><p class="mt-2 text-sm text-muted-foreground">See when a movement reaches its target.</p></div>
				</Card.Content>
			</Card.Root>
			<Card.Root variant="feature" class="min-w-0 transition-transform motion-safe:hover:-translate-y-0.5">
				<Card.Content class="space-y-5">
					<div class="surface-inset flex h-36 items-center justify-center rounded-xl p-3">
						<div class="w-36 rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-card)]"><div class="flex items-center justify-between"><span class="font-mono text-[9px] font-semibold">Session report</span><span class="font-mono text-[9px] text-primary">P03</span></div><div class="mt-3 flex h-10 items-end gap-1">{#each [35, 55, 46, 75, 62, 88, 72, 100] as bar}<span class="flex-1 rounded-t-sm bg-primary/70" style:height={bar + '%'}></span>{/each}</div><div class="mt-2 flex justify-between border-t border-border pt-2 font-mono text-[9px]"><span>9 / 12 reps</span><kbd class="kbd">Print</kbd></div></div>
					</div>
					<div><h3 class="text-title">Printable reports</h3><p class="mt-2 text-sm text-muted-foreground">Review saved sessions and print results.</p></div>
				</Card.Content>
			</Card.Root>
		</div>
	</Container>
</section>
