<script lang="ts">
	import { cn } from '#lib/utils.js';

	let {
		compact = false,
		class: className = '',
		href = '/'
	}: { compact?: boolean; class?: string; href?: string } = $props();
</script>

<a
	{href}
	class={cn('group inline-flex items-center gap-3 text-primary', className)}
	aria-label="Alder Rehabilitation home"
>
	<svg
		class={cn('shrink-0', compact ? 'size-9' : 'size-11')}
		viewBox="0 0 42 44"
		fill="none"
		aria-hidden="true"
	>
		<rect
			x="1"
			y="1"
			width="40"
			height="42"
			rx="7"
			class="fill-primary/6 stroke-primary/40"
			stroke-width="1.4"
		/>
		<path
			d="m10 32 11-21 11 21M14.4 24h13.2"
			stroke="currentColor"
			stroke-width="2.4"
			stroke-linecap="square"
			stroke-linejoin="round"
		/>
	</svg>
	<span class="flex flex-col">
		<strong
			class={cn(
				'font-display font-bold leading-none tracking-[-0.045em]',
				compact ? 'text-2xl' : 'text-[1.75rem]'
			)}>Alder</strong
		>
		<span
			class={cn(
				'font-semibold tracking-[0.18em] text-primary/70',
				compact ? 'mt-1 text-[0.55rem]' : 'mt-1.5 text-[0.6rem]'
			)}>REHABILITATION</span
		>
	</span>
</a>
