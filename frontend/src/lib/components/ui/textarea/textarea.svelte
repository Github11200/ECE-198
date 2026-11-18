<script lang="ts">
	import { cn, type WithElementRef } from "#lib/utils.js";
	import type { HTMLTextareaAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		"data-slot": dataSlot = "textarea",
		...restProps
	}: WithElementRef<HTMLTextareaAttributes> = $props();
</script>

<textarea
	bind:this={ref}
	bind:value
	data-slot={dataSlot}
	class={cn("field min-h-24 w-full min-w-0 px-3 py-2 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className)}
	{...restProps}
></textarea>
