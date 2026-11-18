<script lang="ts">
	import { heroIntro } from '#lib/motion.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Container } from '#lib/components/ui/container/index.js';
	import { Backdrop } from '#lib/components/graphics/index.js';
	import HeroDemo from './hero-demo.svelte';
</script>

<section use:heroIntro class="relative isolate overflow-hidden pt-36 pb-16 md:pt-44 md:pb-24" aria-labelledby="home-title">
	<Backdrop preset="hero" />
	<Container class="relative text-center">
		<h1 id="home-title" data-hero-intro class="text-display-xl mx-auto max-w-4xl text-balance">Every rep, <span class="font-serif-accent">counted</span> live.</h1>
		<p data-hero-intro class="text-lead mx-auto mt-6 max-w-xl">One camera counts every rep for up to five people, with live range cues and printable reports.</p>
		<div data-hero-intro class="mt-8 flex flex-wrap items-center justify-center gap-3">
			<Button variant="hero" size="xl" href="/admin/">Start a session</Button>
			<Button variant="outline" size="xl" href="/patient/">View my sessions</Button>
		</div>
		<div data-hero-intro class="relative mx-auto mt-14 max-w-5xl text-left md:mt-16"><HeroDemo /></div>
	</Container>
</section>
