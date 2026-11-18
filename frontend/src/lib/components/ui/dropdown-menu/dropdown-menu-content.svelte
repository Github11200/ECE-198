<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "#lib/utils.js";
	import DropdownMenuPortal from "./dropdown-menu-portal.svelte";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		sideOffset = 4,
		align = "start",
		portalProps,
		class: className,
		...restProps
	}: DropdownMenuPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DropdownMenuPortal>>;
	} = $props();
</script>

<DropdownMenuPortal {...portalProps}>
	<DropdownMenuPrimitive.Content
		bind:ref
		data-slot="dropdown-menu-content"
		{sideOffset}
		{align}
		class={cn(
			"z-50 max-h-(--bits-dropdown-menu-content-available-height) min-w-32 w-(--bits-dropdown-menu-anchor-width) origin-(--bits-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-xl)] data-closed:overflow-hidden data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 data-open:zoom-in-[0.97] data-closed:zoom-out-[0.97] duration-[160ms] ease-[var(--ease-out)]",
			className
		)}
		{...restProps}
	/>
</DropdownMenuPortal>
