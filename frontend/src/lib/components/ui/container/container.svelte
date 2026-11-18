<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "#lib/utils.js";

	let {
		size = "default",
		class: className,
		as = "div",
		children
	}: {
		size?: "narrow" | "default" | "wide";
		class?: string;
		as?: keyof HTMLElementTagNameMap;
		children?: Snippet;
	} = $props();
</script>

<svelte:element
	this={as}
	data-slot="container"
	class={cn(
		"mx-auto w-full px-5 sm:px-6 lg:px-8",
		size === "narrow" && "max-w-3xl",
		size === "default" && "max-w-[75rem]",
		size === "wide" && "max-w-[90rem]",
		className
	)}
>
	{@render children?.()}
</svelte:element>
