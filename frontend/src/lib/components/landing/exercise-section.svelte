<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ChartLineData01Icon } from '@hugeicons/core-free-icons';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { exerciseGroups, savedResults } from './content.js';
</script>

<div class="bg-muted/40 border-y">
	<section
		id="exercises"
		class="page-container scroll-mt-20 py-12 sm:py-16"
		aria-labelledby="exercise-title"
	>
		<div class="grid gap-8 lg:grid-cols-[1fr_1.8fr] lg:gap-16">
			<div class="max-w-md">
				<h2 id="exercise-title" class="text-2xl font-bold tracking-tight sm:text-3xl">
					Exercise options
				</h2>
				<p class="text-muted-foreground mt-3 text-base leading-relaxed">
					Select the movement and review its fixed demo criteria in the admin dashboard.
				</p>
				<p class="text-muted-foreground mt-4 text-sm leading-relaxed">
					A rep counts toward the range target when the measured joint angle reaches the value shown.
					These are the same demonstration criteria for everyone, not individual prescriptions.
				</p>
			</div>

			<div class="bg-card overflow-hidden rounded-xl border shadow-xs">
				<table class="w-full table-fixed border-b text-left text-sm">
					<caption class="sr-only">Exercises and their fixed demo range targets</caption>
					<colgroup>
						<col class="w-[46%]" />
						<col />
						<col class="w-[5.5rem] sm:w-28" />
					</colgroup>
					<thead class="text-muted-foreground border-b text-xs tracking-wider uppercase">
						<tr>
							<th scope="col" class="py-3 pr-3 pl-4 font-bold sm:pl-5">Exercise</th>
							<th scope="col" class="px-3 py-3 font-bold">Measured</th>
							<th scope="col" class="py-3 pr-4 pl-3 text-right font-bold sm:pr-5">Target</th>
						</tr>
					</thead>
					{#each exerciseGroups as group (group.title)}
						<tbody class="divide-y border-b last:border-b-0">
							<tr class="bg-muted/50">
								<th scope="colgroup" colspan="3" class="px-4 py-2.5 text-left font-normal sm:px-5">
									<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
										<span class="text-foreground font-bold">{group.title}</span>
										<Badge variant="secondary" class="num">{group.items.length}</Badge>
										<span class="text-muted-foreground text-xs sm:ml-auto">{group.note}</span>
									</span>
								</th>
							</tr>
							{#each group.items as item (item.name)}
								<tr>
									<th scope="row" class="py-3 pr-3 pl-4 font-semibold sm:pl-5">{item.name}</th>
									<td class="text-muted-foreground px-3 py-3">{item.measure}</td>
									<td
										class="num text-primary py-3 pr-4 pl-3 text-right font-bold whitespace-nowrap sm:pr-5"
										>{item.target}</td
									>
								</tr>
							{/each}
						</tbody>
					{/each}
				</table>
				<div class="flex gap-3 px-4 py-4 sm:px-5">
					<HugeiconsIcon
						icon={ChartLineData01Icon}
						size={18}
						strokeWidth={1.8}
						class="text-primary mt-0.5 shrink-0"
					/>
					<p class="text-sm leading-relaxed">
						<strong class="font-bold">Saved results.</strong>
						<span class="text-muted-foreground">{savedResults}</span>
					</p>
				</div>
			</div>
		</div>
	</section>
</div>
