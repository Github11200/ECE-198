<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { HugeiconsIcon } from "@hugeicons/svelte"
	import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import { cn } from "#lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		children,
		...restProps
	}: DropdownMenuPrimitive.SubTriggerProps & {
		inset?: boolean;
	} = $props();
</script>

<DropdownMenuPrimitive.SubTrigger
	bind:ref
	data-slot="dropdown-menu-sub-trigger"
	data-inset={inset}
	class={cn(
		"flex h-8 cursor-default items-center gap-2 rounded-lg px-2.5 text-sm outline-hidden select-none focus:bg-muted focus:text-foreground data-open:bg-muted data-open:text-foreground data-inset:pl-8 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} class="cn-rtl-flip ml-auto" />
</DropdownMenuPrimitive.SubTrigger>
