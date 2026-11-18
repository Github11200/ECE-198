<script lang="ts">
	import HomeHeader from '#lib/components/landing/home-header.svelte';
	import HomeHero from '#lib/components/landing/home-hero.svelte';
	import WorkflowSection from '#lib/components/landing/workflow-section.svelte';
	import ExerciseSection from '#lib/components/landing/exercise-section.svelte';
	import AboutSection from '#lib/components/landing/about-section.svelte';
	import HomeFooter from '#lib/components/landing/home-footer.svelte';
</script>

<svelte:head>
	<title>Exercise session tracker · Alder Rehabilitation</title>
	<meta
		name="description"
		content="CCCARE exercise session tracker, a Waterloo ECE 198 prototype. Set participant targets, monitor a supervised group session and review saved results."
	/>
</svelte:head>

<div class="bg-background flex min-h-svh flex-col">
	<HomeHeader />
	<main id="main" class="flex-1">
		<HomeHero />
		<WorkflowSection />
		<ExerciseSection />
		<AboutSection />
	</main>
	<HomeFooter />
</div>
