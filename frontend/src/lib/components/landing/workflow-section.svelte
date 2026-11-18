<script lang="ts">
	import { workflow } from './content.js';
</script>

<section
	id="workflow"
	class="page-container scroll-mt-20 border-t py-12 sm:py-16"
	aria-labelledby="workflow-title"
>
	<div class="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
		<h2 id="workflow-title" class="text-2xl font-bold tracking-tight sm:text-3xl">
			Session workflow
		</h2>
		<p class="text-muted-foreground text-sm">One exercise and one group at a time.</p>
	</div>

	<ol class="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
		{#each workflow as step, index (step.title)}
			<li class="bg-card flex gap-4 rounded-xl border p-5 sm:p-6">
				<span
					class="num bg-accent text-accent-foreground grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold"
					aria-hidden="true">{index + 1}</span
				>
				<div>
					<h3 class="text-base font-bold tracking-tight">
						<span class="sr-only">Step {index + 1}: </span>{step.title}
					</h3>
					<p class="text-muted-foreground mt-2 text-sm leading-relaxed">{step.text}</p>
				</div>
			</li>
		{/each}
	</ol>
</section>
