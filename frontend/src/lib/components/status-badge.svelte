<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { cn } from '#lib/utils.js';

	type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'danger';

	let {
		label,
		tone = 'neutral',
		dot = true,
		class: className = ''
	}: { label: string; tone?: Tone; dot?: boolean; class?: string } = $props();

	const tones: Record<Tone, string> = {
		neutral: 'border-border bg-muted/70 text-muted-foreground',
		success: 'border-success/25 bg-success/10 text-success',
		warning: 'border-warning/30 bg-warning/12 text-[color-mix(in_oklab,var(--warning),black_22%)] dark:text-warning',
		info: 'border-chart-5/25 bg-chart-5/10 text-chart-5',
		danger: 'border-destructive/25 bg-destructive/10 text-destructive'
	};

	const dots: Record<Tone, string> = {
		neutral: 'bg-muted-foreground/70',
		success: 'bg-success',
		warning: 'bg-warning',
		info: 'bg-chart-5',
		danger: 'bg-destructive'
	};
</script>

<Badge variant="outline" class={cn('gap-1.5 font-semibold', tones[tone], className)}>
	{#if dot}
		<span class={cn('size-1.5 rounded-full', dots[tone])} aria-hidden="true"></span>
	{/if}
	{label}
</Badge>
