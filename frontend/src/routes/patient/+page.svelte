<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Alert02Icon,
		Calendar03Icon,
		ChartColumnIcon,
		Dumbbell01Icon,
		Target01Icon
	} from '@hugeicons/core-free-icons';
	import PortalShell from '#lib/components/portal-shell.svelte';
	import PageHeading from '#lib/components/page-heading.svelte';
	import StatCard from '#lib/components/stat-card.svelte';
	import ResultNotes from '#lib/components/result-notes.svelte';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#lib/components/ui/card/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import { patientSessions, patientSummary } from '#lib/dashboard.js';
	import { cloudHistory } from '#lib/cloud-history.svelte.js';
	import { liveFeedback } from '#lib/live-feedback.svelte.js';
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
	const connected = $derived(Boolean(liveFeedback.client));
	const latestLabel = $derived(
		summary.latestReps === null ? '—' : `${summary.latestReps} / ${summary.latestTarget}`
	);
</script>

<svelte:head>
	<title>Patient view · Alder Rehabilitation</title>
</svelte:head>

<PortalShell role="patient">
	<PageHeading
		eyebrow="Patient view"
		title="My sessions"
		description="Attendance and individual results from saved group sessions, with your instructor’s review notes."
	>
		{#snippet actions()}
			<div class="flex flex-col gap-1.5">
				<Label for="patient-id" class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
					Viewing as
				</Label>
				<select
					id="patient-id"
					class="border-input bg-background focus-visible:ring-ring/50 h-11 min-w-44 rounded-lg border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
					bind:value={participantId}
				>
					{#each ids as id (id)}
						<option value={id}>{id} · Participant {id.slice(1)}</option>
					{/each}
				</select>
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

	<section class="grid gap-4 sm:grid-cols-3" aria-label="Summary">
		<StatCard
			label="Sessions attended"
			value={summary.attended}
			hint="Saved group sessions"
			icon={Calendar03Icon}
			{loading}
		/>
		<StatCard
			label="Latest reps"
			value={latestLabel}
			hint="Most recent session"
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
		<h2 id="sessions-heading" class="text-lg font-bold tracking-tight">Session history</h2>

		{#if loading}
			<div class="flex flex-col gap-4" role="status" aria-label="Loading sessions">
				{#each Array.from({ length: 2 }, (_, i) => i) as row (row)}
					<Skeleton class="h-64 w-full rounded-xl" />
				{/each}
			</div>
		{:else if !connected}
			<Card class="items-center gap-3 px-6 py-12 text-center">
				<h3 class="font-semibold">Connect to view saved sessions.</h3>
				<p class="text-muted-foreground max-w-sm text-sm leading-relaxed">Enter the team’s feedback read token above to load results.</p>
			</Card>
		{:else if rows.length === 0}
			<Card class="items-center gap-3 px-6 py-12 text-center">
				<span class="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
					<HugeiconsIcon icon={ChartColumnIcon} size={22} strokeWidth={1.8} />
				</span>
				<h3 class="font-semibold">No sessions recorded for {participantId} yet.</h3>
				<p class="text-muted-foreground max-w-sm text-sm leading-relaxed">
					Results appear here after your instructor saves a group session.
				</p>
			</Card>
		{:else}
			<ol class="flex flex-col gap-4" aria-label="Saved sessions">
				{#each rows as { session, person } (session.id)}
					<li>
						<Card class="gap-0 py-0">
							<CardHeader class="px-5 pt-5 sm:px-6">
								<CardTitle class="text-base">{session.exercise_label} · {session.station}</CardTitle>
								<CardDescription>
									{workoutDate(session.started_at)} · {sourceNames[session.source]}
								</CardDescription>
							</CardHeader>

							<CardContent class="flex flex-col gap-6 px-5 py-5 sm:px-6">
								<p class="text-muted-foreground text-sm leading-relaxed">{session.criteria.description}</p>

								<div class="flex flex-col gap-2">
									<div class="flex items-baseline justify-between gap-3 text-sm">
										<span class="text-muted-foreground font-medium">Reps completed</span>
										<span class="font-semibold tabular-nums">{person.reps} / {person.target}</span>
									</div>
									<Progress
										class="h-2"
										value={person.reps}
										max={Math.max(person.target, 1)}
										aria-label={`Reps completed for ${session.exercise_label}`}
									/>
								</div>

								<dl class="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
									<div>
										<dt class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Full / short</dt>
										<dd class="mt-1 font-semibold tabular-nums">{person.full} / {person.short}</dd>
									</div>
									<div>
										<dt class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Range score</dt>
										<dd class="mt-1 font-semibold tabular-nums">{percent(person.range_score)}</dd>
									</div>
									<div>
										<dt class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Tracking coverage</dt>
										<dd class="mt-1 font-semibold tabular-nums">{percent(person.tracking_coverage)}</dd>
									</div>
									<div>
										<dt class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Tracking losses</dt>
										<dd class="mt-1 font-semibold tabular-nums">{person.tracking_losses ?? 'Not recorded'}</dd>
									</div>
									<div>
										<dt class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Discarded attempts</dt>
										<dd class="mt-1 font-semibold tabular-nums">{person.discarded_attempts ?? 'Not recorded'}</dd>
									</div>
								</dl>

								<div class="flex flex-col gap-3">
									<h3 class="text-sm font-semibold">Review notes</h3>
									<ResultNotes {person} />
								</div>
							</CardContent>
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
