<script lang="ts">
	import type { Snippet } from 'svelte';
	let { eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: Snippet } = $props();
</script>

<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
	<div class="min-w-0 max-w-2xl">
		{#if eyebrow}<p class="eyebrow mb-1">{eyebrow}</p>{/if}
		<h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
		{#if description}<p class="mt-1 text-sm text-muted-foreground">{description}</p>{/if}
	</div>
	{#if actions}<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>{/if}
</div>
