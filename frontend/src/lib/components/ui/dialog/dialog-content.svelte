<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { HugeiconsIcon } from "@hugeicons/svelte"
	import { Cancel01Icon } from '@hugeicons/core-free-icons';
	import { Button } from "#lib/components/ui/button/index.js";
	import { cn, type WithoutChildrenOrChild } from "#lib/utils.js";
	import DialogOverlay from "./dialog-overlay.svelte";
	import DialogPortal from "./dialog-portal.svelte";
	import type { Snippet } from "svelte";
	import type { ComponentProps } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		showCloseButton = true,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		showCloseButton?: boolean;
	} = $props();
</script>

<DialogPortal {...portalProps}>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			"fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%_-_2rem)] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-[20px] border border-border bg-popover p-6 text-sm text-popover-foreground shadow-[var(--shadow-xl)] outline-none sm:max-w-lg data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 data-open:zoom-in-[0.97] data-closed:zoom-out-[0.97] duration-[160ms] ease-[var(--ease-out)]",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close data-slot="dialog-close">
				{#snippet child({ props })}
					<Button variant="ghost" class="absolute top-3 right-3 rounded-full" size="icon-sm" {...props}>
						<HugeiconsIcon icon={Cancel01Icon} strokeWidth={2}  />
						<span class="sr-only">Close</span>
					</Button>
				{/snippet}
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPortal>
