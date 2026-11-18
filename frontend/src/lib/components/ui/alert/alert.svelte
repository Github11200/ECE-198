<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";

	export const alertVariants = tv({
		base: "grid gap-0.5 rounded-2xl border px-4 py-3 text-left text-sm/relaxed has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 group/alert relative w-full",
		variants: {
			variant: {
				default: "surface-card",
				destructive: "alert-tint [--alert-color:var(--destructive)]",
				success: "alert-tint [--alert-color:var(--success)]",
				warning: "alert-tint [--alert-color:var(--warning)]",
				info: "alert-tint [--alert-color:var(--info)]",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	});

	export type AlertVariant = VariantProps<typeof alertVariants>["variant"];
</script>

<script lang="ts">
	import { cn, type WithElementRef } from "#lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		variant = "default",
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariant;
	} = $props();
</script>

<div
	bind:this={ref}
	data-slot="alert"
	data-variant={variant}
	role="alert"
	class={cn(alertVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
