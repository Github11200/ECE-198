<script lang="ts">
	import { cn } from '#lib/utils.js';

	type Props = {
		opacity?: number;
		class?: string;
	};

	let { opacity = 0.06, class: className = '' }: Props = $props();

	const noise =
		"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
</script>

<div
	aria-hidden="true"
	class={cn('pointer-events-none absolute inset-0 mix-blend-multiply dark:mix-blend-soft-light', className)}
	style={`background-image: ${noise}; background-size: 200px 200px; opacity: ${opacity};`}
></div>
