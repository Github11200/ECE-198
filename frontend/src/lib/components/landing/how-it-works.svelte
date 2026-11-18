<script lang="ts">
	import { revealOnScroll } from '#lib/motion.js';
	import { Container } from '#lib/components/ui/container/index.js';
	import { Backdrop } from '#lib/components/graphics/index.js';
	import SectionHeading from './section-heading.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ClipboardCheckIcon, Video01Icon, PrinterIcon } from '@hugeicons/core-free-icons';
	const steps = [
		{ number: '01', icon: ClipboardCheckIcon, title: 'Set up the group', description: 'Pick one exercise, add up to five IDs, and set targets.' },
		{ number: '02', icon: Video01Icon, title: 'Run the session', description: 'One camera counts reps; each band shows its wearer’s count.' },
		{ number: '03', icon: PrinterIcon, title: 'Review and print', description: 'Save results, print reports, and let participants review their sessions.' }
	];
</script>

{#snippet heading()}Three steps to a clearer <span class="font-serif-accent">session</span>.{/snippet}
<section id="how-it-works" aria-labelledby="how-it-works-title" class="relative isolate scroll-mt-20 overflow-hidden py-20 md:py-28">
	<Backdrop preset="section" />
	<Container>
		<SectionHeading id="how-it-works-title" title={heading} description="From setup to saved results in one simple flow." />
		<div class="relative mt-12">
		<div aria-hidden="true" class="absolute top-5 right-[12%] left-[12%] hidden border-t border-dashed border-border-strong md:block"></div>
		<ol use:revealOnScroll={'children'} class="relative grid gap-8 md:grid-cols-3 md:gap-6">
			{#each steps as step}
				<li class="relative min-w-0"><div class="mb-6 flex items-center gap-3"><span class="font-mono text-xs text-primary">{step.number}</span><span class="text-primary"><HugeiconsIcon icon={step.icon} size={20} strokeWidth={1.8} /></span></div><h3 class="text-title">{step.title}</h3><p class="mt-2 max-w-xs text-sm text-muted-foreground">{step.description}</p></li>
			{/each}
		</ol>
		</div>
	</Container>
</section>
