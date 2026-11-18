<script lang="ts">
	import { revealOnScroll } from '#lib/motion.js';
	import { Container } from '#lib/components/ui/container/index.js';
	import { Backdrop } from '#lib/components/graphics/index.js';
	import SectionHeading from './section-heading.svelte';
	import { exercises } from './content.js';
	let { rehabilitationFirst = false }: { rehabilitationFirst?: boolean } = $props();
	let groups = $derived(rehabilitationFirst ? ['Rehabilitation', 'Strength'] as const : ['Strength', 'Rehabilitation'] as const);
</script>

{#snippet heading()}Seven movements, one <span class="font-serif-accent">standard</span>.{/snippet}
<section id="exercises" aria-labelledby="exercises-title" class="relative isolate scroll-mt-20 overflow-hidden py-20 md:py-28">
	<Backdrop preset="section" />
	<Container>
		<SectionHeading id="exercises-title" title={heading} description="Choose one movement per session and follow its measured range target." />
		<div class="mt-12 space-y-9">
			{#each groups as group}
				<div>
					<div class="mb-4 flex items-center gap-3"><h3 class="text-sm font-semibold">{group}</h3><span class="font-mono text-xs text-muted-foreground">{exercises.filter((item) => item.category === group).length.toString().padStart(2, '0')}</span><span class="h-px flex-1 bg-border"></span></div>
					<div use:revealOnScroll={'children'} class="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
						{#each exercises.filter((item) => item.category === group) as exercise}
							<div class="flex min-h-16 min-w-0 flex-col justify-start border-t border-border pt-4">
								<h4 class="text-sm font-semibold leading-snug">{exercise.name}</h4>
								<div class="mt-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1 font-mono text-[10px]"><span class="min-w-0 text-muted-foreground">{exercise.joint}</span><span class="shrink-0 text-sm font-semibold text-primary">{exercise.target}</span></div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</Container>
</section>
