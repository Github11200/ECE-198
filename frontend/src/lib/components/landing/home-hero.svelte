<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import { Button } from '#lib/components/ui/button/index.js';
</script>

<section class="page-container py-10 sm:py-14 lg:py-16" aria-labelledby="home-title">
	<div class="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
		<div class="max-w-xl">
			<p class="eyebrow">CCCARE · ECE 198 PROJECT</p>
			<h1
				id="home-title"
				class="mt-4 text-4xl leading-[1.08] font-bold tracking-[-0.035em] sm:text-5xl"
			>
				Exercise session tracker
			</h1>
			<p class="text-muted-foreground mt-5 text-lg leading-relaxed">
				Set participant targets, monitor exercise activity, and review the results of a supervised
				group session.
			</p>
			<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
				<Button href="/admin/" size="lg">
					Open admin dashboard
					<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} data-icon="inline-end" />
				</Button>
				<Button href="/patient/" size="lg" variant="outline">Patient view</Button>
			</div>
			<p class="text-muted-foreground mt-5 max-w-md text-sm leading-relaxed">
				The admin dashboard connects to the local tracker on the session laptop. The patient view
				shows saved results for a numbered participant ID.
			</p>
		</div>

		<figure class="w-full">
			<div class="bg-muted overflow-hidden rounded-2xl border shadow-sm">
				<img
					src="/images/rehabilitation-session.jpg"
					alt="A physiotherapist supporting a participant during an exercise"
					class="aspect-[16/10] max-h-96 w-full object-cover lg:aspect-[5/4] lg:max-h-none"
					width="1400"
					height="933"
					fetchpriority="high"
					decoding="async"
				/>
			</div>
			<figcaption class="text-muted-foreground mt-2.5 text-xs">
				Supervised exercise · stock photograph
			</figcaption>
		</figure>
	</div>
</section>
