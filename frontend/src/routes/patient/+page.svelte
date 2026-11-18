<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Alert02Icon,
		Calendar03Icon,
		ChartColumnIcon,
		Dumbbell01Icon,
		Plug01Icon,
		Target01Icon
	} from '@hugeicons/core-free-icons';
	import PortalShell from '#lib/components/portal-shell.svelte';
	import PageHeading from '#lib/components/page-heading.svelte';
	import StatCard from '#lib/components/stat-card.svelte';
	import ResultNotes from '#lib/components/result-notes.svelte';
	import { Card } from '#lib/components/ui/card/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import { patientSessions, patientSummary } from '#lib/dashboard.js';
	import { cloudHistory } from '#lib/cloud-history.svelte.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { tracker } from '#lib/tracker.svelte.js';
	import { percent, sourceNames, workoutDate } from '#lib/tracker-api.js';

	let participantId = $state('P01');

	// Same ID range as the original participant portal.
	const ids = Array.from({ length: 99 }, (_, index) => `P${String(index + 1).padStart(2, '0')}`);

	// Follow this participant's Convex archive while the page is open.
	$effect(() => {
		cloudHistory.follow(participantId);
		return () => cloudHistory.stop();
	});
	const rows = $derived(patientSessions(tracker.history, participantId));
	const summary = $derived(patientSummary(rows));
	const loading = $derived(tracker.historyLoading && !tracker.history.length);
	// Convex archive once connected, otherwise the tracker's saved sessions.
	const connected = $derived(tracker.historyAvailable);
	const latestLabel = $derived(
		summary.latestReps === null ? '—' : `${summary.latestReps} / ${summary.latestTarget}`
	);
</script>

<svelte:head>
	<title>My sessions · Alder Rehabilitation</title>
</svelte:head>

<PortalShell role="patient">
	<PageHeading title="My sessions" description="Your saved sessions and results.">
		{#snippet actions()}
			<div class="flex items-center gap-2">
				<Label for="patient-id" class="text-muted-foreground text-xs">Viewing as</Label>
				<Select.Root type="single" bind:value={participantId}>
					<Select.Trigger id="patient-id" aria-label="Viewing as" class="w-48">
						<span class="truncate">{participantId} · Participant {participantId.slice(1)}</span>
					</Select.Trigger>
					<Select.Content class="max-h-72">
						{#each ids as id (id)}
							<Select.Item value={id} label={`${id} · Participant ${id.slice(1)}`} />
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{/snippet}
	</PageHeading>

	{#if tracker.historyError && !tracker.history.length}
		<Alert variant="destructive" role="alert">
			<HugeiconsIcon icon={Alert02Icon} size={18} strokeWidth={2} />
			<AlertTitle>Results unavailable</AlertTitle>
			<AlertDescription>{tracker.historyError}</AlertDescription>
		</Alert>
	{/if}

	<section class="grid gap-3 sm:grid-cols-3" aria-label="Summary">
		<StatCard
			label="Sessions attended"
			value={summary.attended}
			hint="Saved sessions"
			icon={Calendar03Icon}
			{loading}
		/>
		<StatCard
			label="Latest reps"
			value={latestLabel}
			hint="Most recent"
			icon={Dumbbell01Icon}
			tone="accent"
			{loading}
		/>
		<StatCard
			label="Average range score"
			value={summary.averageRange === null ? '—' : percent(summary.averageRange)}
			hint={summary.notes ? `${summary.notes} session(s) with review notes` : 'No review notes so far'}
			icon={Target01Icon}
			tone="blue"
			{loading}
		/>
	</section>

	<section aria-labelledby="sessions-heading" class="flex flex-col gap-4">
		<h2 id="sessions-heading" class="text-base font-semibold">Session history</h2>

		{#if loading}
			<div class="flex flex-col gap-4" role="status" aria-label="Loading sessions">
				{#each Array.from({ length: 2 }, (_, i) => i) as row (row)}
					<Skeleton class="h-64 w-full rounded-xl" />
				{/each}
			</div>
		{:else if !connected}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<HugeiconsIcon icon={Plug01Icon} strokeWidth={2} />
					</Empty.Media>
					<Empty.Title><h3>Connect to view saved sessions.</h3></Empty.Title>
					<Empty.Description>Enter the read token above to load your results.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else if rows.length === 0}
			<Empty.Root>
				<Empty.Header>
					<Empty.Media variant="icon">
						<HugeiconsIcon icon={ChartColumnIcon} strokeWidth={2} />
					</Empty.Media>
					<Empty.Title><h3>No sessions recorded for {participantId} yet.</h3></Empty.Title>
					<Empty.Description>Results appear after your instructor saves a session.</Empty.Description>
				</Empty.Header>
			</Empty.Root>
		{:else}
			<ol class="flex flex-col gap-4" aria-label="Saved sessions">
				{#each rows as { session, person } (session.id)}
					<li>
						<Card class="gap-0 p-0 py-0">
							<div class="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
								<div class="min-w-0">
									<h3 class="font-semibold">{session.exercise_label} · {session.station}</h3>
									<div class="mt-1.5 flex flex-wrap items-center gap-2">
										<span class="text-muted-foreground font-mono text-xs">
											{workoutDate(session.started_at)}
										</span>
										<Badge variant="secondary">{sourceNames[session.source]}</Badge>
									</div>
								</div>
								<div class="text-right">
									<p class="eyebrow">Reps</p>
									<p class="mt-1 text-2xl font-semibold tabular-nums">{person.reps} / {person.target}</p>
								</div>
							</div>

							<div class="px-5 pt-4">
								<Progress
									class="h-1.5"
									value={person.reps}
									max={Math.max(person.target, 1)}
									aria-label={`Reps completed for ${session.exercise_label}`}
								/>
							</div>

							<div class="px-5 pt-4">
								<dl class="bg-muted/50 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl p-3 sm:grid-cols-5">
									<div>
										<dt class="eyebrow">Full / short</dt>
										<dd class="mt-1 font-mono text-sm tabular-nums">{person.full} / {person.short}</dd>
									</div>
									<div>
										<dt class="eyebrow">Range score</dt>
										<dd class="mt-1 font-mono text-sm tabular-nums">{percent(person.range_score)}</dd>
									</div>
									<div>
										<dt class="eyebrow">Tracking coverage</dt>
										<dd class="mt-1 font-mono text-sm tabular-nums">{percent(person.tracking_coverage)}</dd>
									</div>
									<div>
										<dt class="eyebrow">Tracking losses</dt>
										<dd class="mt-1 font-mono text-sm tabular-nums">{person.tracking_losses ?? 'Not recorded'}</dd>
									</div>
									<div>
										<dt class="eyebrow">Discarded attempts</dt>
										<dd class="mt-1 font-mono text-sm tabular-nums">{person.discarded_attempts ?? 'Not recorded'}</dd>
									</div>
								</dl>
							</div>

							<div class="flex flex-col gap-2 px-5 pt-5 pb-5">
								<h3 class="text-sm font-medium">Review notes</h3>
								<ResultNotes {person} />
							</div>
						</Card>
					</li>
				{/each}
			</ol>
			{#if tracker.historyHasMore}
				<Button variant="outline" class="self-center" onclick={() => tracker.loadMoreHistory()}>Load more sessions</Button>
			{/if}
		{/if}
	</section>
</PortalShell>
