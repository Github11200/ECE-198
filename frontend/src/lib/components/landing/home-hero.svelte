<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Container } from '#lib/components/ui/container/index.js';
	import { Backdrop } from '#lib/components/graphics/index.js';
	import HeroDemo from './hero-demo.svelte';
</script>

<section class="relative isolate overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24" aria-labelledby="home-title">
	<Backdrop preset="hero" />
	<Container class="relative text-center">
		<p class="reveal inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-1.5 font-mono text-[10px] tracking-wide text-foreground shadow-[var(--shadow-xs)] backdrop-blur sm:text-xs">
			<span class="relative flex size-1.5 shrink-0"><span class="absolute inset-0 rounded-full bg-primary motion-safe:animate-ping"></span><span class="relative size-1.5 rounded-full bg-primary"></span></span>
			Live rep tracking for group sessions
		</p>
		<h1 id="home-title" class="reveal text-display-xl mx-auto mt-6 max-w-4xl text-balance" style="--reveal-delay: 80ms">Every rep, <span class="font-serif-accent">counted</span> live.</h1>
		<p class="reveal text-lead mx-auto mt-6 max-w-xl" style="--reveal-delay: 160ms">One camera counts every rep for up to five people, with live range cues and printable reports.</p>
		<div class="reveal mt-8 flex flex-wrap items-center justify-center gap-3" style="--reveal-delay: 240ms">
			<Button variant="hero" size="xl" href="/admin/">Start a session</Button>
			<Button variant="outline" size="xl" href="/patient/">View my sessions</Button>
		</div>
		<div class="reveal relative mx-auto mt-14 max-w-5xl text-left md:mt-16" style="--reveal-delay: 320ms"><HeroDemo /></div>
	</Container>
</section>
