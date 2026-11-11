<script lang="ts">
	import Brand from './brand.svelte';

	const year = new Date().getFullYear();
</script>

<footer class="border-t">
	<div class="page-container py-12">
		<div class="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
			<div class="max-w-sm">
				<Brand compact />
				<p class="text-muted-foreground mt-4 text-sm leading-relaxed">
					Supervised exercise tracking with individual rep targets and clear end-of-session reports.
				</p>
			</div>
			<div class="grid grid-cols-2 gap-8 text-sm md:gap-14">
				<div>
					<p class="text-foreground text-xs font-bold tracking-wider uppercase">Programme</p>
					<ul class="text-muted-foreground mt-3 space-y-2">
						<li><a class="hover:text-foreground" href="#workflow">How it works</a></li>
						<li><a class="hover:text-foreground" href="#exercises">Exercises</a></li>
						<li><a class="hover:text-foreground" href="#about">About</a></li>
					</ul>
				</div>
				<div>
					<p class="text-foreground text-xs font-bold tracking-wider uppercase">Dashboards</p>
					<ul class="text-muted-foreground mt-3 space-y-2">
						<li><a class="hover:text-foreground" href="/admin/">Admin</a></li>
						<li><a class="hover:text-foreground" href="/patient/">Patient</a></li>
						<li><a class="hover:text-foreground" href="/rehabilitation-programme/">Programme overview</a></li>
					</ul>
				</div>
			</div>
		</div>
		<div
			class="text-muted-foreground mt-10 flex flex-col gap-2 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between"
		>
			<p>© {year} Alder Rehabilitation · CCCARE Exercise Tracker</p>
		</div>
	</div>
</footer>
