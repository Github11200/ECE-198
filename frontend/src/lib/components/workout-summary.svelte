<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Dumbbell01Icon, PrinterIcon, Target01Icon } from '@hugeicons/core-free-icons';
	import ResultNotes from './result-notes.svelte';
	import StatCard from './stat-card.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#lib/components/ui/table/index.js';
	import {
		percent,
		sourceNames,
		totalRangeScore,
		totalReps,
		totalTarget,
		workoutDate,
		type Workout
	} from '#lib/tracker-api.js';

	let { workout }: { workout: Workout } = $props();
	const reps = $derived(totalReps(workout));
	const target = $derived(totalTarget(workout));
	const rangeScore = $derived(totalRangeScore(workout));
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<p class="text-muted-foreground text-sm">
			{workoutDate(workout.finished_at || workout.started_at)} · {sourceNames[workout.source]}
		</p>
		<h3 class="text-xl font-bold tracking-tight">{workout.exercise_label} · {workout.station}</h3>
	</div>

	<div class="grid gap-3 sm:grid-cols-2">
		<StatCard label="Completed / prescribed reps" value={`${reps} / ${target}`} icon={Dumbbell01Icon} />
		<StatCard label="Range score" value={percent(rangeScore)} icon={Target01Icon} tone="accent" />
	</div>

	<p class="text-muted-foreground text-sm leading-relaxed">{workout.criteria.description}</p>

	<div class="overflow-x-auto">
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
						<TableCell class="text-right tabular-nums">{person.reps} / {person.target}</TableCell>
						<TableCell class="text-right tabular-nums">{person.full} / {person.short}</TableCell>
						<TableCell class="text-right tabular-nums">{percent(person.range_score)}</TableCell>
						<TableCell class="text-right tabular-nums">{percent(person.tracking_coverage)}</TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	</div>

	<div class="flex flex-col gap-3">
		{#each workout.participants as person (person.id)}
			<div class="border-t pt-5 first:border-t-0 first:pt-0">
				<p class="text-sm font-semibold">
					{person.id} review ·
					<span class="text-muted-foreground font-normal">
						{person.issues.length ? `${person.issues.length} note(s)` : 'Range and dose met'}
					</span>
				</p>
				<p class="text-muted-foreground mt-1 text-sm">
					Tracking losses: {person.tracking_losses ?? 'Not recorded'} · Discarded attempts: {person.discarded_attempts ?? 'Not recorded'}
				</p>
				<div class="mt-3">
					<ResultNotes {person} />
				</div>
			</div>
		{/each}
	</div>

	<p class="text-muted-foreground text-xs leading-relaxed">
		Range score measures completed attempts reaching the fixed angle target. Dose completion and tracking coverage are separate measurements.
	</p>

	<div class="flex justify-end">
		<Button variant="outline" onclick={() => window.print()}>
			<HugeiconsIcon icon={PrinterIcon} size={16} strokeWidth={2} data-icon="inline-start" />
			Print session report
		</Button>
	</div>
</div>
