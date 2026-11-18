<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { AppFrame } from '#lib/components/graphics/index.js';
	import ProductPreview from './product-preview.svelte';

	let { still = false }: { still?: boolean } = $props();
	let mounted = $state(false);
	let reduced = $state(false);
	let videoReady = $state(false);
	let posterReady = $state(false);
	let videoEl = $state<HTMLVideoElement>();
	let posterEl = $state<HTMLImageElement>();

	onMount(() => {
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const update = async () => {
			reduced = still || media.matches;
			videoReady = false;
			posterReady = false;
			mounted = true;
			await tick();
			if (reduced) posterReady = !!posterEl?.complete && !!posterEl.naturalWidth;
			else if (videoEl) {
				videoEl.muted = true;
				videoReady = videoEl.readyState >= 2;
			}
		};
		void update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	});
</script>

<figure class="min-w-0">
	<AppFrame title="alder · live session">
		<div class="relative aspect-[16/10] w-full overflow-hidden bg-background">
			<ProductPreview />
			{#if mounted}
				{#if reduced}
					<img bind:this={posterEl} src="/media/alder-demo-poster.webp" alt="" class={posterReady ? 'absolute inset-0 size-full object-cover opacity-100' : 'absolute inset-0 size-full object-cover opacity-0'} onload={() => (posterReady = true)} onerror={() => (posterReady = false)} />
				{:else}
					<video bind:this={videoEl} autoplay muted loop playsinline preload="metadata" poster="/media/alder-demo-poster.webp" class={videoReady ? 'absolute inset-0 size-full object-cover opacity-100 motion-safe:transition-opacity motion-safe:duration-500' : 'absolute inset-0 size-full object-cover opacity-0 motion-safe:transition-opacity motion-safe:duration-500'} onloadeddata={() => (videoReady = true)} onerror={() => (videoReady = false)} aria-hidden="true">
						<source src="/media/alder-demo.webm" type="video/webm" />
						<source src="/media/alder-demo.mp4" type="video/mp4" onerror={() => (videoReady = false)} />
					</video>
				{/if}
			{/if}
		</div>
	</AppFrame>
	<figcaption class="sr-only">{still ? "Alder's instructor dashboard, listing participant sessions with reps against target and range scores." : "A looping walkthrough of Alder's instructor dashboard: setting up a group session, live rep counts and saved results."}</figcaption>
</figure>
