<script lang="ts">
	import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/svelte';
	import { Card } from '#lib/components/ui/card/index.js';
	import { cn } from '#lib/utils.js';

	let {
		label,
		value,
		hint,
		icon,
		tone = 'primary',
		loading = false,
		class: className = ''
	}: {
		label: string;
		value: string | number;
		hint?: string;
		icon: IconSvgElement;
		tone?: 'primary' | 'accent' | 'clay' | 'blue';
		loading?: boolean;
		class?: string;
	} = $props();

	const tones = {
		primary: 'bg-primary/10 text-primary',
		accent: 'bg-accent text-accent-foreground',
		clay: 'bg-clay/12 text-clay',
		blue: 'bg-chart-5/12 text-chart-5'
	};
</script>

<Card class={cn('gap-3 p-0 py-0', className)}>
	<div class="flex items-start gap-4 p-5">
		<span class={cn('grid size-11 shrink-0 place-items-center rounded-xl', tones[tone])}>
			<HugeiconsIcon {icon} size={21} strokeWidth={1.7} />
		</span>
		<div class="min-w-0 flex-1">
			<p class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{label}</p>
			<p class="stat-value mt-1.5">
				{#if loading}<span class="text-muted-foreground/60">—</span>{:else}{value}{/if}
			</p>
			{#if hint}<p class="text-muted-foreground mt-1 text-xs leading-relaxed">{hint}</p>{/if}
		</div>
	</div>
</Card>
