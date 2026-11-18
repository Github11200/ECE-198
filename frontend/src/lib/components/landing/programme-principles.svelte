<script lang="ts">
	import { revealOnScroll } from '#lib/motion.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Container } from '#lib/components/ui/container/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { IdVerifiedIcon, Target01Icon, PrinterIcon } from '@hugeicons/core-free-icons';

	let { variant }: { variant: 'rehabilitation' | 'cancer' } = $props();

	const principles = [
		{ icon: IdVerifiedIcon, title: 'Numbered IDs', description: 'Participants are numbers, with no face recognition.' },
		{ icon: Target01Icon, title: 'Individual targets', description: 'Each person gets their own rep target.' },
		{ icon: PrinterIcon, title: 'Printable reports', description: 'Save results to history and print in one click.' }
	];
</script>

<section aria-labelledby="programme-principles-title" class="relative isolate border-y border-border/70 bg-muted/30 py-20 md:py-28">
	<Container>
		<h2 use:revealOnScroll id="programme-principles-title" class="text-display text-balance">
			{#if variant === 'cancer'}
				Built for every <span class="font-serif-accent">participant</span>.
			{:else}
				Built for the <span class="font-serif-accent">room</span>.
			{/if}
		</h2>
		<div use:revealOnScroll={'children'} class="mt-10 grid gap-4 md:grid-cols-3">
			{#each principles as principle}
				<Card.Root variant="feature" size="sm" class="min-w-0">
					<Card.Content>
						<span class="mb-5 grid size-10 place-items-center rounded-xl border border-border bg-accent text-primary shadow-[var(--shadow-xs)]" aria-hidden="true">
							<HugeiconsIcon icon={principle.icon} size={19} strokeWidth={1.8} />
						</span>
						<h3 class="text-title">{principle.title}</h3>
						<p class="mt-2 text-sm text-muted-foreground">{principle.description}</p>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</Container>
</section>
