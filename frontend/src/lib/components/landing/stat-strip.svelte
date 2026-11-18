<script lang="ts">
	import { Container } from '#lib/components/ui/container/index.js';
	const stats = [
		{ value: '7', label: 'Guided exercises' },
		{ value: '1–5', label: 'People per camera' },
		{ value: 'Live', label: 'Reps and range' },
		{ value: '0', label: 'Faces stored' }
	];
</script>

<section class="border-y border-border/80 bg-card/60" aria-label="Alder at a glance">
	<Container class="grid grid-cols-2 md:grid-cols-4">
		{#each stats as stat, index}
			<div class:border-l={index % 2 === 1} class:md:border-l={index > 0} class:md:border-t-0={true} class:border-t={index > 1} class="flex min-h-28 flex-col justify-center border-border px-4 py-5 md:min-h-32 md:px-6">
				<span class="stat-value">{stat.value}</span>
				<span class="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
			</div>
		{/each}
	</Container>
</section>
