<script lang="ts">
	import { Container } from '#lib/components/ui/container/index.js';
	import SectionHeading from './section-heading.svelte';
	import { exercises } from './content.js';
	let { rehabilitationFirst = false }: { rehabilitationFirst?: boolean } = $props();
	let groups = $derived(rehabilitationFirst ? ['Rehabilitation', 'Strength'] as const : ['Strength', 'Rehabilitation'] as const);
</script>

{#snippet heading()}Seven movements, one <span class="font-serif-accent">standard</span>.{/snippet}
<section id="exercises" aria-labelledby="exercises-title" class="relative isolate scroll-mt-14 overflow-hidden py-20 md:py-28">
	<Container>
		<SectionHeading id="exercises-title" eyebrow="Exercise library" title={heading} description="Choose one movement per session and follow its measured range target." />
		<div class="mt-12 space-y-9">
			{#each groups as group}
				<div>
					<div class="mb-4 flex items-center gap-3"><h3 class="text-sm font-semibold">{group}</h3><span class="font-mono text-xs text-muted-foreground">{exercises.filter((item) => item.category === group).length.toString().padStart(2, '0')}</span><span class="h-px flex-1 bg-border"></span></div>
					<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
						{#each exercises.filter((item) => item.category === group) as exercise}
							<div class="flex min-h-28 min-w-0 flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:min-h-32 sm:p-5 shadow-[var(--shadow-xs)]">
								<h4 class="text-sm font-semibold leading-snug">{exercise.name}</h4>
								<div class="mt-4 flex flex-wrap items-end justify-between gap-x-2 gap-y-1 font-mono text-[10px]"><span class="min-w-0 text-muted-foreground">{exercise.joint}</span><span class="shrink-0 text-sm font-semibold text-primary">{exercise.target}</span></div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</Container>
</section>
