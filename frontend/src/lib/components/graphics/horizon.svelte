<script lang="ts">
	import { cn } from '#lib/utils.js';

	type Props = {
		class?: string;
	};

	let { class: className = '' }: Props = $props();
</script>

<div
	aria-hidden="true"
	class={cn('pointer-events-none absolute inset-x-0 bottom-0 h-[60%] overflow-hidden', className)}
>
	<div
		class="absolute top-0 left-1/2 aspect-[2/1] w-[200%] -translate-x-1/2 rounded-[100%]"
		style="border-top: 1px solid color-mix(in oklab, var(--glow) 70%, transparent); background: radial-gradient(32% 16% at 50% 0%, color-mix(in oklab, var(--glow) 20%, transparent), transparent 100%); box-shadow: 0 -8px 40px -4px color-mix(in oklab, var(--glow) 45%, transparent);"
	></div>
</div>
