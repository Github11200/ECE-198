<script lang="ts">
	import Brand from '#lib/components/brand.svelte';
	import ThemeToggle from '#lib/components/theme-toggle.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { sectionLinks } from './content.js';
</script>

<header
	class="bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-30 border-b backdrop-blur-lg"
>
	<div class="page-container flex h-16 items-center justify-between gap-3">
		<Brand compact />
		<nav class="hidden items-center gap-1 md:flex" aria-label="Page sections">
			{#each sectionLinks as link (link.href)}
				<a
					href={link.href}
					class="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 rounded-lg px-3 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px]"
					>{link.label}</a
				>
			{/each}
		</nav>
		<div class="flex items-center gap-1 sm:gap-2">
			<ThemeToggle />
			<Button variant="ghost" size="sm" href="/patient/" class="hidden sm:inline-flex">
				Patient view
			</Button>
			<Button size="sm" href="/admin/">Admin dashboard</Button>
		</div>
	</div>
</header>
