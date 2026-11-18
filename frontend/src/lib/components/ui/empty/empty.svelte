<script lang="ts">
	import { cn, type WithElementRef } from "#lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="empty"
	class={cn(
		"empty-pattern gap-4 rounded-2xl p-6 flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
