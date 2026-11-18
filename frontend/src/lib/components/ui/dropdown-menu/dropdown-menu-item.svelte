<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
	import { cn } from "#lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		inset,
		variant = "default",
		...restProps
	}: DropdownMenuPrimitive.ItemProps & {
		inset?: boolean;
		variant?: "default" | "destructive";
	} = $props();
</script>

<DropdownMenuPrimitive.Item
	bind:ref
	data-slot="dropdown-menu-item"
	data-inset={inset}
	data-variant={variant}
	class={cn(
		"group/dropdown-menu-item relative flex h-8 cursor-default items-center gap-2 rounded-lg px-2.5 text-sm outline-hidden select-none focus:bg-muted focus:text-foreground data-inset:pl-8 data-disabled:pointer-events-none data-disabled:opacity-50 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		className
	)}
	{...restProps}
/>
