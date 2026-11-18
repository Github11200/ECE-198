<script lang="ts">
	import Brand from '#lib/components/brand.svelte';
	import { Container } from '#lib/components/ui/container/index.js';
	const product = [
		{ label: 'Live session', href: '/admin/' },
		{ label: 'Participant view', href: '/patient/' },
		{ label: 'Exercises', href: '/#exercises' }
	];
	const programmes = [
		{ label: 'Rehabilitation programme', href: '/rehabilitation-programme/' },
		{ label: 'Cancer exercise programme', href: '/cancer-exercise-program/' }
	];
</script>

<footer class="border-t border-border bg-muted/30">
	<Container>
		<div class="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
			<div><Brand size="sm" /><p class="mt-3 text-sm text-muted-foreground">Every rep in clear view.</p></div>
			<nav aria-label="Product links"><h2 class="mb-4 font-mono text-[11px] uppercase tracking-wider text-foreground">Product</h2><ul class="space-y-3 text-sm text-muted-foreground">{#each product as link}<li><a href={link.href} class="rounded-md outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">{link.label}</a></li>{/each}</ul></nav>
			<nav aria-label="Programme links"><h2 class="mb-4 font-mono text-[11px] uppercase tracking-wider text-foreground">Programmes</h2><ul class="space-y-3 text-sm text-muted-foreground">{#each programmes as link}<li><a href={link.href} class="rounded-md outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50">{link.label}</a></li>{/each}</ul></nav>
			<div><h2 class="mb-4 font-mono text-[11px] uppercase tracking-wider text-foreground">Privacy</h2><p class="max-w-44 text-sm text-muted-foreground">Numbered IDs. No face recognition.</p></div>
		</div>
		<div class="border-t border-border py-5 font-mono text-[10px] text-muted-foreground">© 2026 Alder Rehabilitation</div>
	</Container>
</footer>
