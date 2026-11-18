<script lang="ts">
	import Brand from '#lib/components/brand.svelte';
	import ThemeToggle from '#lib/components/theme-toggle.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Container } from '#lib/components/ui/container/index.js';
	import { sectionLinks } from './content.js';
	let scrolled = $state(false);
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 8)} />

<header class:border-border={scrolled} class:border-transparent={!scrolled} class="sticky top-0 z-40 h-14 border-b bg-background/70 backdrop-blur-md">
	<Container class="flex h-full min-w-0 items-center justify-between gap-2">
		<div class="min-w-0 shrink-0"><Brand size="sm" /></div>
		<nav class="hidden items-center gap-0.5 lg:flex" aria-label="Page sections">
			{#each sectionLinks as link (link.href)}
				<a href={link.href} class="rounded-md px-2.5 py-1.5 text-[13px] whitespace-nowrap text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">{link.label}</a>
			{/each}
		</nav>
		<div class="flex shrink-0 items-center gap-1 sm:gap-2">
			<ThemeToggle />
			<Button href="/patient/" variant="outline" size="sm" class="hidden sm:inline-flex">Participant login</Button>
			<Button href="/admin/" size="sm">Open dashboard</Button>
		</div>
	</Container>
</header>
