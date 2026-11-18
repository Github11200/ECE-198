<script lang="ts">
	import Brand from '#lib/components/brand.svelte';
	import ThemeToggle from '#lib/components/theme-toggle.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { sectionLinks } from './content.js';
	let scrolled = $state(false);
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 12)} />

<!-- Floating nav: invisible over the hero, a frosted bar once the page scrolls. -->
<header class="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4">
	<div class="nav-shell mx-auto flex h-12 max-w-6xl min-w-0 items-center justify-between gap-2 pr-1.5 pl-2.5" data-scrolled={scrolled}>
		<div class="flex min-w-0 shrink-0 items-center"><Brand size="sm" /></div>
		<nav class="hidden items-center gap-0.5 lg:flex" aria-label="Page sections">
			{#each sectionLinks as link (link.href)}
				<a href={link.href} class="rounded-full px-3 py-1.5 text-[13px] whitespace-nowrap text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">{link.label}</a>
			{/each}
		</nav>
		<div class="flex shrink-0 items-center gap-1 sm:gap-2">
			<ThemeToggle />
			<Button href="/patient/" variant="ghost" size="sm" class="hidden sm:inline-flex">Participant login</Button>
			<Button href="/admin/" size="sm">Open dashboard</Button>
		</div>
	</div>
</header>
