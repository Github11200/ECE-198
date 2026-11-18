<script lang="ts">
	import { skeletonShimmer } from '#lib/motion.js';
	import { cn, type WithElementRef, type WithoutChildren } from "#lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> = $props();
</script>

<div
	use:skeletonShimmer
	bind:this={ref}
	data-slot="skeleton"
	class={cn("skeleton-surface rounded-md", className)}
	{...restProps}
></div>
