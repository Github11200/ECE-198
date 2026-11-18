<script lang="ts">
	import { cn, type WithElementRef } from "#lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = "default",
		variant = "default",
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { size?: "default" | "sm"; variant?: "default" | "elevated" | "inset" | "feature" } = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-size={size}
	data-variant={variant}
	class={cn("text-card-foreground gap-(--card-spacing) overflow-hidden rounded-2xl py-(--card-spacing) text-sm [--card-spacing:--spacing(5)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] group/card flex flex-col", variant === "default" ? "surface-card" : "surface-" + variant, className)}
	{...restProps}
>
	{@render children?.()}
</div>
