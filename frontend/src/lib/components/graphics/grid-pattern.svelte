<script lang="ts">
	import { cn } from '#lib/utils.js';

	type Props = {
		variant?: 'lines' | 'dots';
		size?: number;
		fade?: 'radial' | 'top' | 'bottom' | 'none';
		class?: string;
	};

	let {
		variant = 'lines',
		size = 32,
		fade = 'radial',
		class: className = ''
	}: Props = $props();

	const backgroundImage = $derived(
		variant === 'dots'
			? 'radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 16%, transparent) 1px, transparent 0)'
			: 'linear-gradient(to right, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px)'
	);

	const masks = {
		radial: 'radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%)',
		top: 'linear-gradient(to bottom, #000, transparent 85%)',
		bottom: 'linear-gradient(to top, #000, transparent 85%)',
		none: 'none'
	};
</script>

<div
	aria-hidden="true"
	class={cn('pointer-events-none absolute inset-0', className)}
	style={`background-image: ${backgroundImage}; background-size: ${size}px ${size}px; mask-image: ${masks[
		fade
	]}; -webkit-mask-image: ${masks[fade]};`}
></div>
