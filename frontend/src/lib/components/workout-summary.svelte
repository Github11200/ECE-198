<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Dumbbell01Icon, File01Icon, InformationCircleIcon, PrinterIcon, Target01Icon } from '@hugeicons/core-free-icons';
	import ResultNotes from './result-notes.svelte';
	import StatCard from './stat-card.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Card } from '#lib/components/ui/card/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#lib/components/ui/table/index.js';
	import {
		percent,
		sourceNames,
		totalRangeScore,
		totalReps,
		totalTarget,
		workoutDate,
		reportUrl,
		type Workout
	} from '#lib/tracker-api.js';

	let { workout }: { workout: Workout } = $props();
	const reps = $derived(totalReps(workout));
	const target = $derived(totalTarget(workout));
	const rangeScore = $derived(totalRangeScore(workout));
	const report = $derived(reportUrl(workout));
</script>

<Tooltip.Provider>
<div class="flex min-w-0 flex-col gap-5">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0 space-y-2">
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-xs font-mono tabular-nums text-muted-foreground">{workoutDate(workout.finished_at || workout.started_at)}</span>
				<span class="text-muted-foreground" aria-hidden="true">·</span>
				<Badge variant="secondary">{sourceNames[workout.source]}</Badge>
			</div>
			<h3 class="text-lg font-semibold tracking-tight sm:text-xl">{workout.exercise_label} · {workout.station}</h3>
		</div>
		<Tooltip.Root>
			<Tooltip.Trigger aria-label="Session criteria" class="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
				<HugeiconsIcon icon={InformationCircleIcon} size={16} strokeWidth={2} />
			</Tooltip.Trigger>
			<Tooltip.Content>{workout.criteria.description}</Tooltip.Content>
		</Tooltip.Root>
	</div>

	<div class="grid gap-3 sm:grid-cols-2">
		<StatCard label="Completed / prescribed reps" value={`${reps} / ${target}`} icon={Dumbbell01Icon} />
		<div class="relative min-w-0">
			<StatCard label="Range score" value={percent(rangeScore)} icon={Target01Icon} tone="accent" />
			<Tooltip.Root>
				<Tooltip.Trigger aria-label="About range score" class="absolute bottom-3 right-3 inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
					<HugeiconsIcon icon={InformationCircleIcon} size={15} strokeWidth={2} />
				</Tooltip.Trigger>
				<Tooltip.Content>Range score measures completed attempts reaching the fixed angle target. Dose completion and tracking coverage are separate measurements.</Tooltip.Content>
			</Tooltip.Root>
		</div>
	</div>

	<Card class="gap-0 p-0 py-0">
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Participant / lane</TableHead>
					<TableHead class="text-right">Reps / target</TableHead>
					<TableHead class="text-right">Full / short</TableHead>
					<TableHead class="text-right">Range score</TableHead>
					<TableHead class="text-right">Tracking coverage</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each workout.participants as person (person.id)}
					<TableRow>
						<TableCell>
							<span class="block font-semibold">{person.id}</span>
							<span class="text-muted-foreground text-xs">Lane {person.lane}</span>
						</TableCell>
						<TableCell class="text-right font-mono tabular-nums">{person.reps} / {person.target}</TableCell>
						<TableCell class="text-right font-mono tabular-nums">{person.full} / {person.short}</TableCell>
						<TableCell class="text-right font-mono tabular-nums">{percent(person.range_score)}</TableCell>
						<TableCell class="text-right font-mono tabular-nums">{percent(person.tracking_coverage)}</TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	</Card>

	<div class="flex flex-col divide-y divide-border/70 border-y border-border/70">
		{#each workout.participants as person (person.id)}
			<div class="py-4 first:pt-0 last:pb-0">
				<div class="flex flex-wrap items-center gap-2">
					<p class="text-sm font-semibold">{person.id} review</p>
					<Badge variant={person.issues.length ? 'warning' : 'success'}>{person.issues.length} {person.issues.length === 1 ? 'note' : 'notes'}</Badge>
				</div>
				<p class="text-muted-foreground mt-1 text-xs">
					Tracking losses: <span class="font-mono tabular-nums">{person.tracking_losses ?? '—'}</span> · Discarded attempts: <span class="font-mono tabular-nums">{person.discarded_attempts ?? '—'}</span>
				</p>
				<div class="mt-3">
					<ResultNotes {person} />
				</div>
			</div>
		{/each}
	</div>

	<div class="flex flex-wrap justify-end gap-2">
		{#if report}
			<!-- Served by the Python tracker, not a SvelteKit route, so skip client routing. -->
			<Button variant="outline" href={report} target="_blank" rel="noopener" data-sveltekit-reload>
				<HugeiconsIcon icon={File01Icon} size={16} strokeWidth={2} data-icon="inline-start" />
				Open printable report
			</Button>
		{/if}
		<Button variant="ghost" onclick={() => window.print()}>
			<HugeiconsIcon icon={PrinterIcon} size={16} strokeWidth={2} data-icon="inline-start" />
			Print
		</Button>
	</div>
</div>
</Tooltip.Provider>
