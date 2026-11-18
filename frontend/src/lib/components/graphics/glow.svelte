<script lang="ts">
	import { cn } from '#lib/utils.js';

	type Props = {
		color?: 'primary' | 'mint' | 'cyan' | 'clay';
		size?: string;
		opacity?: number;
		class?: string;
	};

	let { color = 'mint', size = '40rem', opacity = 0.5, class: className = '' }: Props = $props();

	const colors = {
		primary: 'var(--primary)',
		mint: 'var(--glow)',
		cyan: 'var(--glow-2)',
		clay: 'var(--clay)'
	};
</script>

<div
	aria-hidden="true"
	class={cn(
		'pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 rounded-full',
		className
	)}
	style={`width: ${size}; height: ${size}; background: radial-gradient(closest-side, color-mix(in oklab, ${colors[
		color
	]} 60%, transparent), transparent); filter: blur(40px); opacity: ${opacity};`}
></div>
