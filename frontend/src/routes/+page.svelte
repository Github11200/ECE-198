<script lang="ts">
	import HomeHeader from '#lib/components/landing/home-header.svelte';
	import HomeHero from '#lib/components/landing/home-hero.svelte';
	import StatStrip from '#lib/components/landing/stat-strip.svelte';
	import FeatureGrid from '#lib/components/landing/feature-grid.svelte';
	import HowItWorks from '#lib/components/landing/how-it-works.svelte';
	import LiveBand from '#lib/components/landing/live-band.svelte';
	import ExerciseSection from '#lib/components/landing/exercise-section.svelte';
	import CtaBand from '#lib/components/landing/cta-band.svelte';
	import HomeFooter from '#lib/components/landing/home-footer.svelte';
</script>

<svelte:head>
	<title>Alder · Live rep tracking for group exercise</title>
	<meta name="description" content="Alder tracks live reps and range for group exercise, with saved sessions, printable reports, and participant views." />
</svelte:head>

<div class="flex min-h-svh flex-col bg-background text-foreground">
	<HomeHeader />
	<main id="main" class="min-w-0 flex-1">
		<HomeHero />
		<StatStrip />
		<FeatureGrid />
		<HowItWorks />
		<LiveBand />
		<ExerciseSection />
		<CtaBand />
	</main>
	<HomeFooter />
</div>
