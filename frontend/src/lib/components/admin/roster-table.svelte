<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import StatusBadge from '../status-badge.svelte';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#lib/components/ui/table/index.js';
	import { participantLabel, type RosterEntry } from '#lib/dashboard.js';
	import { percent, sourceNames, workoutDate } from '#lib/tracker-api.js';

	let {
		entries,
		onSelect
	}: { entries: RosterEntry[]; onSelect: (id: string) => void } = $props();
</script>

<div class="overflow-x-auto">
	<Table aria-label="Participants">
		<TableHeader>
			<TableRow class="hover:bg-transparent">
				<TableHead>Participant</TableHead>
				<TableHead>Exercise</TableHead>
				<TableHead class="min-w-40">Reps / target</TableHead>
				<TableHead class="text-right">Range score</TableHead>
				<TableHead>Status</TableHead>
				<TableHead class="w-12"><span class="sr-only">Open</span></TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each entries as entry (entry.id)}
				<TableRow>
					<TableCell>
						<button
							type="button"
							class="hover:text-primary focus-visible:ring-ring/50 inline-flex min-h-11 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-[3px]"
							onclick={() => onSelect(entry.id)}
						>
							<span
								class="bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums"
								aria-hidden="true">{entry.id.slice(1)}</span
							>
							<span class="flex flex-col">
								<span class="font-semibold">{participantLabel(entry.id)}</span>
								<span class="text-muted-foreground text-xs">
									{entry.id}{entry.live && entry.result ? ` · lane ${entry.result.lane}` : ''}
								</span>
							</span>
						</button>
					</TableCell>
					<TableCell>
						<span class="block">{entry.workout?.exercise_label ?? 'No session yet'}</span>
						{#if entry.workout}
							<span class="text-muted-foreground text-xs">
								{entry.live ? 'Live now' : workoutDate(entry.workout.finished_at ?? entry.workout.started_at)} ·
								{sourceNames[entry.workout.source]}
							</span>
						{/if}
					</TableCell>
					<TableCell>
						{#if entry.result}
							<div class="flex items-center gap-3">
								<span class="w-14 text-sm tabular-nums">
									<strong>{entry.result.reps}</strong> / {entry.result.target}
								</span>
								<Progress
									class="h-1.5 max-w-24 flex-1"
									value={entry.result.reps}
									max={Math.max(entry.result.target, 1)}
									aria-label={`${entry.id} rep progress`}
								/>
							</div>
						{:else}
							<span class="text-muted-foreground">—</span>
						{/if}
					</TableCell>
					<TableCell class="text-right tabular-nums">{percent(entry.result?.range_score)}</TableCell>
					<TableCell><StatusBadge label={entry.status.label} tone={entry.status.tone} /></TableCell>
					<TableCell>
						<button
							type="button"
							class="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 grid size-11 place-items-center rounded-lg outline-none focus-visible:ring-[3px]"
							aria-label={`View ${entry.id}`}
							onclick={() => onSelect(entry.id)}
						>
							<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={2} />
						</button>
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>
