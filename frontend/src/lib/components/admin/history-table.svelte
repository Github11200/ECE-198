<script lang="ts">
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

	let { sessions, onView }: { sessions: Workout[]; onView: (session: Workout) => void } = $props();
</script>

<div class="overflow-x-auto">
	<Table aria-label="Completed sessions">
		<TableHeader>
			<TableRow class="hover:bg-transparent">
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
				<TableRow>
					<TableCell>
						<span class="block font-semibold">{session.exercise_label}</span>
						<span class="text-muted-foreground text-xs">{session.station} · {sourceNames[session.source]}</span>
					</TableCell>
					<TableCell class="whitespace-normal">{workoutDate(session.finished_at ?? session.started_at)}</TableCell>
					<TableCell class="text-right tabular-nums">{session.participants.length}</TableCell>
					<TableCell class="text-right tabular-nums">{totalReps(session)} / {totalTarget(session)}</TableCell>
					<TableCell class="text-right tabular-nums">{percent(totalRangeScore(session))}</TableCell>
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
