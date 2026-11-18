<script lang="ts">
	import { livePulse } from '#lib/motion.js';
	import { cn } from '#lib/utils.js';

	let { class: className }: { class?: string } = $props();
</script>

<span aria-hidden="true" class={cn('relative inline-flex size-2 shrink-0', className)}>
	<span use:livePulse class="absolute inset-0 rounded-full bg-current opacity-0"></span>
	<span class="relative size-full rounded-full bg-current"></span>
</span>
