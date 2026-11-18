<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "#lib/utils.js";
	import DropdownMenuPortal from "./dropdown-menu-portal.svelte";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		align = "start",
		alignOffset = -3,
		portalProps,
		...restProps
	}: DropdownMenuPrimitive.SubContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DropdownMenuPortal>>;
	} = $props();
</script>

<DropdownMenuPortal {...portalProps}>
	<DropdownMenuPrimitive.SubContent
		bind:ref
		data-slot="dropdown-menu-sub-content"
		{align}
		{alignOffset}
		class={cn(
			"z-50 min-w-32 origin-(--bits-dropdown-menu-content-transform-origin) overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-xl)] data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 data-open:zoom-in-[0.97] data-closed:zoom-out-[0.97] duration-[160ms] ease-[var(--ease-out)]",
			className
		)}
		{...restProps}
	/>
</DropdownMenuPortal>
