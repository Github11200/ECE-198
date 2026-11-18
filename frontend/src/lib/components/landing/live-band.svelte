<script lang="ts">
	import { revealOnScroll } from '#lib/motion.js';
	import { Container } from '#lib/components/ui/container/index.js';
	import { Scenery } from '#lib/components/graphics/index.js';
	import SectionHeading from './section-heading.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Camera01Icon, Target02Icon, SmartWatch01Icon } from '@hugeicons/core-free-icons';
</script>

{#snippet heading()}From camera to <span class="font-serif-accent">wrist</span> in real time.{/snippet}
<section id="live" aria-labelledby="live-title" class="dark relative isolate scroll-mt-20 overflow-hidden bg-background py-20 text-foreground md:py-28">
	<Scenery preset="section" />
	<Container class="relative grid min-w-0 items-center gap-12 lg:grid-cols-2 lg:gap-16">
		<div>
			<SectionHeading id="live-title" title={heading} description="See reps and range as they happen, with each person’s count on their wrist." />
			<ul use:revealOnScroll={'children'} class="mt-8 space-y-4 text-sm">
				<li class="flex items-center gap-3"><span class="shrink-0 text-primary"><HugeiconsIcon icon={Camera01Icon} size={15} strokeWidth={1.8} /></span>One camera, up to five people</li>
				<li class="flex items-center gap-3"><span class="shrink-0 text-primary"><HugeiconsIcon icon={Target02Icon} size={15} strokeWidth={1.8} /></span>Range checked on every rep</li>
				<li class="flex items-center gap-3"><span class="shrink-0 text-primary"><HugeiconsIcon icon={SmartWatch01Icon} size={15} strokeWidth={1.8} /></span>Count shown on each band</li>
			</ul>
		</div>
		<div use:revealOnScroll class="relative min-w-0">
			<div class="relative grid gap-6 sm:grid-cols-[1fr_1fr] sm:items-center">
				<div class="relative isolate h-64 overflow-hidden rounded-2xl border border-border bg-background p-4">
					<div class="absolute inset-0" style="background: radial-gradient(70% 60% at 30% 15%, color-mix(in oklab, var(--leaf-2) 28%, transparent), transparent 70%), radial-gradient(60% 60% at 80% 95%, color-mix(in oklab, var(--clay) 18%, transparent), transparent 70%);"></div>
					<div class="relative flex items-center justify-between font-mono text-[10px] text-muted-foreground"><span>CAMERA / P03</span></div>
					<svg viewBox="0 0 160 180" class="relative mx-auto mt-2 h-40 w-36 text-primary" fill="none" aria-hidden="true">
						<circle cx="80" cy="18" r="10" stroke="currentColor" stroke-width="3" /><path d="M80 29 L80 88 M80 45 L45 70 L36 105 M80 45 L115 70 L123 105 M80 88 L48 128 L38 170 M80 88 L110 128 L121 170" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" /><circle cx="110" cy="128" r="5" fill="currentColor" /><circle cx="80" cy="88" r="5" fill="currentColor" />
					</svg>
					<div class="relative flex items-center justify-between font-mono text-[10px]"><span>RIGHT KNEE</span><span class="text-primary">160° / ≥ 155°</span></div>
				</div>
				<div class="relative flex min-h-64 items-center justify-center">
					<div class="absolute h-64 w-26 rounded-[28px] border border-foreground/10 bg-gradient-to-r from-muted via-background to-muted shadow-[inset_3px_0_6px_rgb(0_0_0_/_0.4),inset_-3px_0_6px_rgb(255_255_255_/_0.06),0_14px_28px_rgb(0_0_0_/_0.45)]">
						<div class="mx-auto mt-5 h-16 w-3 rounded-full border border-foreground/10"></div><div class="mx-auto mt-3 h-5 w-3 rounded-full border border-foreground/10"></div><div class="mx-auto mt-2 h-5 w-3 rounded-full border border-foreground/10"></div>
					</div>
					<div class="relative flex h-36 w-40 items-center justify-center rounded-[24px] border-4 border-muted bg-background shadow-[0_10px_30px_rgb(0_0_0_/_0.5),inset_0_1px_2px_rgb(255_255_255_/_0.12)]">
						<div class="flex h-28 w-32 flex-col rounded-lg border border-primary/25 bg-black p-3 font-mono text-white shadow-[inset_0_0_10px_rgb(0_0_0_/_0.9)]">
							<span class="text-[10px] tracking-widest text-primary">P03 · LIVE</span>
							<div class="mt-1 flex items-baseline gap-1"><span class="text-5xl leading-none font-semibold tabular-nums text-primary">09</span><span class="text-sm text-white/70">/12</span></div>
							<span class="mt-auto text-[9px] text-white/60">REPS</span>
							<div class="mt-1 h-1 rounded-full bg-white/20"><div class="h-1 w-3/4 rounded-full bg-primary"></div></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Container>
</section>
