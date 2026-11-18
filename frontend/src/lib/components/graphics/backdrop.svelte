<script lang="ts">
	import { cn } from '#lib/utils.js';
	import Glow from './glow.svelte';
	import GridPattern from './grid-pattern.svelte';
	import Horizon from './horizon.svelte';
	import MeshGradient from './mesh-gradient.svelte';
	import Noise from './noise.svelte';

	type Props = {
		preset?: 'hero' | 'section' | 'dashboard';
		class?: string;
	};

	let { preset = 'hero', class: className = '' }: Props = $props();
</script>

<div
	aria-hidden="true"
	class={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
>
	{#if preset === 'hero'}
		<MeshGradient preset="hero" />
		<GridPattern variant="dots" size={24} fade="radial" />
		<Horizon />
		<Noise />
	{:else if preset === 'section'}
		<GridPattern variant="lines" size={48} fade="top" />
		<Glow color="mint" size="36rem" opacity={0.35} />
	{:else}
		<div
			class="absolute inset-x-0 top-0 h-80"
			style="background: radial-gradient(60% 100% at 50% 0%, color-mix(in oklab, var(--glow) 18%, transparent), transparent);"
		></div>
		<GridPattern variant="lines" size={40} fade="top" class="h-80" />
	{/if}
</div>
