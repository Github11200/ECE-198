<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "#lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.OverlayProps = $props();
</script>

<DialogPrimitive.Overlay
	bind:ref
	data-slot="dialog-overlay"
	class={cn("fixed inset-0 isolate z-50 bg-black/30 backdrop-blur-[2px] dark:bg-black/60 data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 duration-[160ms] ease-[var(--ease-out)]", className)}
	{...restProps}
/>
