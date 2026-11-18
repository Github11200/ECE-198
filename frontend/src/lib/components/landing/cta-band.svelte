<script lang="ts">
	import { revealOnScroll } from '#lib/motion.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Container } from '#lib/components/ui/container/index.js';
	import { Scenery } from '#lib/components/graphics/index.js';
	import SectionHeading from './section-heading.svelte';
</script>

{#snippet heading()}Ready for your next <span class="font-serif-accent">session</span>?{/snippet}
<section aria-labelledby="cta-title" class="relative isolate overflow-hidden pb-20 md:pb-28">
	<Container>
		<div class="relative isolate overflow-hidden rounded-[28px] px-5 py-16 sm:px-10 md:py-20">
			<Scenery preset="card" />
			<div class="relative">
				<SectionHeading id="cta-title" title={heading} description="Bring your group together and follow every rep." align="center" />
				<div use:revealOnScroll class="mt-8 flex flex-wrap justify-center gap-3"><Button href="/admin/" size="lg">Start a session</Button><Button href="/patient/" variant="outline" size="lg">View my sessions</Button></div>
			</div>
		</div>
	</Container>
</section>
