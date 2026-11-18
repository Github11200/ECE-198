<script lang="ts">
	import { cn } from '#lib/utils.js';

	type Props = {
		preset?: 'hero' | 'soft' | 'aurora';
		class?: string;
	};

	let { preset = 'hero', class: className = '' }: Props = $props();

	const backgrounds = {
		hero: 'radial-gradient(70% 55% at 50% -5%, color-mix(in oklab, var(--glow) 30%, transparent), transparent 70%), radial-gradient(45% 40% at 8% 0%, color-mix(in oklab, var(--glow-2) 16%, transparent), transparent 70%), radial-gradient(40% 40% at 92% 4%, color-mix(in oklab, var(--glow) 14%, transparent), transparent 70%)',
		soft: 'linear-gradient(160deg, color-mix(in oklab, var(--glow-2) 30%, var(--card)) 0%, color-mix(in oklab, var(--glow) 25%, var(--card)) 55%, color-mix(in oklab, var(--primary) 20%, var(--card)) 100%)',
		aurora:
			'radial-gradient(55% 60% at 12% 100%, color-mix(in oklab, var(--glow) 30%, transparent), transparent 70%), radial-gradient(60% 55% at 50% 105%, color-mix(in oklab, var(--glow-2) 28%, transparent), transparent 70%), radial-gradient(55% 60% at 88% 100%, color-mix(in oklab, var(--primary) 25%, transparent), transparent 70%)'
	};
</script>

<div
	aria-hidden="true"
	class={cn('pointer-events-none absolute inset-0', className)}
	style={`background: ${backgrounds[preset]};`}
></div>
