<script lang="ts">
	import type { Snippet } from 'svelte';
	let { id, eyebrow, title, description, align = 'left' }: {
		id: string; eyebrow?: string; title: Snippet | string; description?: string; align?: 'left' | 'center';
	} = $props();
</script>

<div class={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
	{#if eyebrow}<p class="eyebrow mb-4">{eyebrow}</p>{/if}
	<h2 {id} class="text-display text-balance">
		{#if typeof title === 'string'}{title}{:else}{@render title()}{/if}
	</h2>
	{#if description}<p class="text-lead mt-5">{description}</p>{/if}
</div>
