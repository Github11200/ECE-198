<script lang="ts">
	import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/svelte';
	import { Card } from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { cn } from '#lib/utils.js';

	let {
		label, value, hint, icon, tone = 'primary', loading = false,
		badge, badgeVariant = 'success', class: className = ''
	}: {
		label: string; value: string | number; hint?: string; icon: IconSvgElement;
		tone?: 'primary' | 'accent' | 'clay' | 'blue'; loading?: boolean;
		badge?: string; badgeVariant?: 'success' | 'warning' | 'info' | 'destructive' | 'secondary';
		class?: string;
	} = $props();
	const tones = { primary: 'text-primary', accent: 'text-primary', clay: 'text-warning', blue: 'text-info' };
</script>

<Card size="sm" class={cn('relative', className)}>
	<div class="flex flex-col gap-2 px-4">
		<p class="eyebrow pr-7">{label}</p>
		<div class="flex flex-wrap items-end gap-2">
			<span class="stat-value">{loading ? '—' : value}</span>
			{#if badge}<Badge variant={badgeVariant}>{badge}</Badge>{/if}
		</div>
		{#if hint}<p class="text-xs text-muted-foreground">{hint}</p>{/if}
	</div>
	<HugeiconsIcon {icon} size={16} strokeWidth={2} class={cn('absolute right-4 top-4', tones[tone])} />
</Card>
