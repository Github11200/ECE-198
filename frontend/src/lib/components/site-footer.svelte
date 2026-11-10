<script lang="ts">
	import Brand from './brand.svelte';

	const year = new Date().getFullYear();
</script>

<footer class="bg-muted/40 border-t">
	<div class="page-container py-12">
		<div class="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
			<div class="max-w-sm">
				<Brand compact />
				<p class="text-muted-foreground mt-4 text-sm leading-relaxed">
					A Waterloo ECE 198 project exploring supervised exercise tracking, individual rep targets and
					clear end-of-session reports.
				</p>
			</div>
			<div class="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3 md:gap-14">
				<div>
					<p class="text-foreground text-xs font-bold tracking-wider uppercase">Clinic</p>
					<ul class="text-muted-foreground mt-3 space-y-2">
						<li><a class="hover:text-foreground" href="/#workflow">How it works</a></li>
						<li><a class="hover:text-foreground" href="/#exercises">Exercises</a></li>
						<li><a class="hover:text-foreground" href="/#about">About the prototype</a></li>
					</ul>
				</div>
				<div>
					<p class="text-foreground text-xs font-bold tracking-wider uppercase">Access</p>
					<ul class="text-muted-foreground mt-3 space-y-2">
						<li><a class="hover:text-foreground" href="/login/admin/">Admin panel</a></li>
						<li><a class="hover:text-foreground" href="/login/participant/">Participant portal</a></li>
						<li><a class="hover:text-foreground" href="/rehabilitation-programme/">Programme overview</a></li>
					</ul>
				</div>
				<div class="col-span-2 sm:col-span-1">
					<p class="text-foreground text-xs font-bold tracking-wider uppercase">Demo</p>
					<p class="text-muted-foreground mt-3 leading-relaxed">
						Classroom prototype. Participant records are fictional. Login is navigation only.
					</p>
				</div>
			</div>
		</div>
		<div
			class="text-muted-foreground mt-10 flex flex-col gap-2 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between"
		>
			<p>© {year} Alder Rehabilitation · CCCARE Exercise Tracker</p>
			<p>ECE 198 · Fall 2026 · University of Waterloo</p>
		</div>
	</div>
</footer>
