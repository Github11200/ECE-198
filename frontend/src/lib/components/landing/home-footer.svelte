<script lang="ts">
	import Brand from '#lib/components/brand.svelte';

	const links = [
		{ href: '/admin/', label: 'Admin dashboard' },
		{ href: '/patient/', label: 'Patient view' },
		{ href: '/rehabilitation-programme/', label: 'Programme overview' }
	];
</script>

<footer class="bg-muted/40 border-t">
	<div
		class="page-container flex flex-col gap-5 py-8 md:flex-row md:items-center md:justify-between md:gap-8"
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
			<Brand compact />
			<p class="text-muted-foreground text-sm">CCCARE Exercise Tracker · Classroom prototype</p>
		</div>
		<nav aria-label="Footer">
			<ul class="flex flex-wrap gap-x-5 gap-y-2 text-sm">
				{#each links as link (link.href)}
					<li>
						<a
							href={link.href}
							class="text-muted-foreground hover:text-foreground rounded-sm font-semibold underline-offset-4 hover:underline"
							>{link.label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
</footer>
