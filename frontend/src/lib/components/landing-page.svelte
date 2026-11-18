<script lang="ts">
	import HomeHeader from '#lib/components/landing/home-header.svelte';
	import ProgrammeHero from '#lib/components/landing/programme-hero.svelte';
	import ProgrammePrinciples from '#lib/components/landing/programme-principles.svelte';
	import HowItWorks from '#lib/components/landing/how-it-works.svelte';
	import ExerciseSection from '#lib/components/landing/exercise-section.svelte';
	import CtaBand from '#lib/components/landing/cta-band.svelte';
	import HomeFooter from '#lib/components/landing/home-footer.svelte';

	let { variant = 'rehabilitation' }: { variant?: 'rehabilitation' | 'cancer' } = $props();
</script>

<div class="flex min-h-svh flex-col bg-background text-foreground">
	<HomeHeader />
	<main id="main" class="min-w-0 flex-1">
		<ProgrammeHero {variant} />
		<ProgrammePrinciples {variant} />
		<HowItWorks />
		<ExerciseSection rehabilitationFirst={variant === 'cancer'} />
		<CtaBand />
	</main>
	<HomeFooter />
</div>
