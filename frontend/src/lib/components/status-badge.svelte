<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { cn } from '#lib/utils.js';
	type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'danger';
	let { label, tone = 'neutral', dot = true, class: className = '' }: { label: string; tone?: Tone; dot?: boolean; class?: string } = $props();
	const variants = { neutral: 'secondary', success: 'success', warning: 'warning', info: 'info', danger: 'destructive' } as const;
</script>

<Badge variant={variants[tone]} class={cn('gap-1.5', className)}>
	{#if dot}<span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>{/if}
	{label}
</Badge>
