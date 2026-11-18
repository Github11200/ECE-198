<script lang="ts">
	import { cn } from '#lib/utils.js';

	type Props = {
		/** hero: peach glow at the top · section: faint sage wash · card: glow for a rounded panel · dashboard: 24rem top wash */
		preset?: 'hero' | 'section' | 'card' | 'dashboard';
		class?: string;
	};

	let { preset = 'hero', class: className = '' }: Props = $props();
</script>

<div aria-hidden="true" class={cn('scenery', className)} data-preset={preset}>
	<div class="wash"></div>
</div>

<style>
	.scenery {
		position: absolute;
		inset: 0;
		z-index: -10;
		overflow: hidden;
		pointer-events: none;
	}

	.wash {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(70% 55% at 50% 0%, var(--glow), transparent 75%),
			radial-gradient(40% 35% at 85% 10%, color-mix(in oklab, var(--glow-2) 80%, transparent), transparent 70%);
	}

	.scenery[data-preset='section'] .wash {
		background: radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--glow-2) 70%, transparent), transparent 75%);
	}

	.scenery[data-preset='card'] .wash {
		background:
			radial-gradient(80% 90% at 50% 0%, var(--glow), transparent 80%),
			linear-gradient(to bottom, transparent, color-mix(in oklab, var(--glow-2) 70%, transparent));
	}

	.scenery[data-preset='dashboard'] { bottom: auto; height: 24rem; }
	.scenery[data-preset='dashboard'] .wash {
		background:
			radial-gradient(70% 90% at 50% 0%, color-mix(in oklab, var(--glow) 85%, transparent), transparent 75%),
			linear-gradient(to bottom, transparent 60%, var(--background));
	}
</style>
