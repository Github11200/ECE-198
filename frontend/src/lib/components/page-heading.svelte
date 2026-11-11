<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		description,
		actions
	}: { eyebrow: string; title: string; description: string; actions?: Snippet } = $props();
</script>

<div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
	<div class="max-w-2xl">
		<p class="eyebrow">{eyebrow}</p>
		<h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
		<p class="text-muted-foreground mt-2 text-base leading-relaxed">{description}</p>
	</div>
	{#if actions}
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">{@render actions()}</div>
	{/if}
</div>
