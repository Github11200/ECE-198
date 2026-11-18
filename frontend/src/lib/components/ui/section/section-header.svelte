<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "#lib/utils.js";

	let {
		eyebrow,
		title,
		description,
		align = "center",
		class: className,
		children
	}: {
		eyebrow?: string;
		title: string | Snippet;
		description?: string;
		align?: "left" | "center";
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<div
	data-slot="section-header"
	class={cn(
		"flex max-w-2xl flex-col gap-4",
		align === "center" && "mx-auto items-center text-center",
		align === "left" && "items-start text-left",
		className
	)}
>
	{#if eyebrow}
		<p class="eyebrow">{eyebrow}</p>
	{/if}
	<h2 class="text-display">
		{#if typeof title === "string"}
			{title}
		{:else}
			{@render title()}
		{/if}
	</h2>
	{#if description}
		<p class="text-lead">{description}</p>
	{/if}
	{#if children}
		<div class="flex flex-wrap items-center gap-3" class:justify-center={align === "center"}>
			{@render children()}
		</div>
	{/if}
</div>
