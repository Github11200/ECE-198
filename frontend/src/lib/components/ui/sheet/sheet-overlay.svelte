<script lang="ts">
	import { Dialog as SheetPrimitive } from "bits-ui";
	import { cn } from "#lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SheetPrimitive.OverlayProps = $props();
</script>

<SheetPrimitive.Overlay
	bind:ref
	data-slot="sheet-overlay"
	class={cn(
		"fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] dark:bg-black/60 data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 duration-[160ms] ease-[var(--ease-out)]",
		className
	)}
	{...restProps}
/>
