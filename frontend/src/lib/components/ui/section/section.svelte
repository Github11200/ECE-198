<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "#lib/utils.js";
	import { Container } from "../container/index.js";

	let {
		tone = "default",
		size = "default",
		class: className,
		id,
		children,
		contained = true
	}: {
		tone?: "default" | "muted" | "ink";
		size?: "sm" | "default" | "lg";
		class?: string;
		id?: string;
		children?: Snippet;
		contained?: boolean;
	} = $props();
</script>

<section
	{id}
	data-slot="section"
	class={cn(
		"relative isolate overflow-hidden",
		tone === "default" && "bg-background text-foreground",
		tone === "muted" && "bg-muted text-foreground",
		tone === "ink" && "dark bg-background text-foreground",
		size === "sm" && "py-12 md:py-16",
		size === "default" && "py-20 md:py-28",
		size === "lg" && "py-28 md:py-36",
		className
	)}
>
	{#if contained}
		<Container>
			{@render children?.()}
		</Container>
	{:else}
		{@render children?.()}
	{/if}
</section>
