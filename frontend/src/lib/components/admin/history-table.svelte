<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
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

	let { sessions, onView }: { sessions: Workout[]; onView: (session: Workout) => void } = $props();
</script>

<div class="overflow-x-auto">
	<Table aria-label="Completed sessions">
		<TableHeader>
			<TableRow class="bg-muted/50 hover:bg-muted/50">
				<TableHead>Exercise / station</TableHead>
				<TableHead>Finished</TableHead>
				<TableHead class="text-right">Participants</TableHead>
				<TableHead class="text-right">Reps / target</TableHead>
				<TableHead class="text-right">Range score</TableHead>
				<TableHead class="text-right"><span class="sr-only">Report</span></TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each sessions as session (session.id)}
				<TableRow class="h-12">
					<TableCell>
						<span class="block font-semibold">{session.exercise_label}</span>
						<div class="mt-1 flex flex-wrap items-center gap-2"><span class="text-xs text-muted-foreground">{session.station}</span><Badge variant="secondary">{sourceNames[session.source]}</Badge></div>
					</TableCell>
					<TableCell class="whitespace-normal">{workoutDate(session.finished_at ?? session.started_at)}</TableCell>
					<TableCell class="text-right font-mono tabular-nums">{session.participants.length}</TableCell>
					<TableCell class="text-right font-mono tabular-nums">{totalReps(session)} / {totalTarget(session)}</TableCell>
					<TableCell class="text-right font-mono tabular-nums">{percent(totalRangeScore(session))}</TableCell>
					<TableCell class="text-right">
						<Button variant="ghost" size="sm" onclick={() => onView(session)} aria-label={`View summary for ${session.exercise_label} on ${workoutDate(session.finished_at ?? session.started_at)}`}>
							View summary
						</Button>
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>
