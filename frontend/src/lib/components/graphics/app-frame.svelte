<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '#lib/utils.js';

	type Props = {
		title?: string;
		class?: string;
		children?: Snippet;
	};

	let { title, class: className = '', children }: Props = $props();
</script>

<div
	class={cn('relative overflow-hidden rounded-[20px] border border-border bg-card', className)}
	style="box-shadow: var(--shadow-xl);"
>
	<div class="relative flex h-10 items-center gap-1.5 border-b border-border bg-muted/50 px-4">
		<span class="size-2.5 rounded-full bg-foreground/15"></span>
		<span class="size-2.5 rounded-full bg-foreground/15"></span>
		<span class="size-2.5 rounded-full bg-foreground/15"></span>
		{#if title}
			<span
				class="absolute left-1/2 -translate-x-1/2 font-mono text-[11px] text-muted-foreground"
				>{title}</span
			>
		{/if}
	</div>
	<div>
		{@render children?.()}
	</div>
</div>
