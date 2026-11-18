<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { cn } from "#lib/utils.js";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		...restProps
	}: ComponentProps<typeof DropdownMenuPrimitive.GroupHeading> & {
		inset?: boolean;
	} = $props();
</script>

<DropdownMenuPrimitive.GroupHeading
	bind:ref
	data-slot="dropdown-menu-group-heading"
	data-inset={inset}
	class={cn("px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground data-inset:pl-8", className)}
	{...restProps}
/>
