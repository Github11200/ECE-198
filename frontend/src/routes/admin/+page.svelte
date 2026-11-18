<script lang="ts">
	import LiveDot from '#lib/components/live-dot.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Alert02Icon,
		Calendar03Icon,
		CheckmarkCircle02Icon,
		ClipboardCheckIcon,
		Add01Icon,
		PlayIcon,
		Search01Icon,
		UserMultipleIcon
	} from '@hugeicons/core-free-icons';
	import PortalShell from '#lib/components/portal-shell.svelte';
	import PageHeading from '#lib/components/page-heading.svelte';
	import StatCard from '#lib/components/stat-card.svelte';
	import WorkoutSummary from '#lib/components/workout-summary.svelte';
	import RosterTable from '#lib/components/admin/roster-table.svelte';
	import HistoryTable from '#lib/components/admin/history-table.svelte';
	import ParticipantDialog from '#lib/components/admin/participant-dialog.svelte';
	import SessionSetupDialog from '#lib/components/admin/session-setup-dialog.svelte';
	import LiveMonitorDialog from '#lib/components/admin/live-monitor-dialog.svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Card } from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import { buildRoster, filterRoster, type RosterFilter } from '#lib/dashboard.js';
	import { tracker } from '#lib/tracker.svelte.js';
	import { cloudHistory } from '#lib/cloud-history.svelte.js';
	import { sourceNames, totalReps, totalTarget, type SessionSetup, type Workout } from '#lib/tracker-api.js';

	let search = $state('');
	let filter = $state<RosterFilter>('all');
	let tab = $state('participants');
	let historyParticipant = $state('');
	let selectedId = $state<string | null>(null);
	let participantOpen = $state(false);
	let setupOpen = $state(false);
	let monitorOpen = $state(false);
	let summary = $state<Workout | null>(null);
	// Focus the dialog itself on open so the info tooltips don't pop open.
	let summaryContent = $state<HTMLElement | null>(null);
	let notice = $state('');
	let endError = $state('');
	let nextTargets = $state<Record<string, number>>({});

	const roster = $derived(buildRoster(tracker.history, tracker.session));
	const visibleRoster = $derived(filterRoster(roster, search, filter));
	const reviewCount = $derived(roster.filter((entry) => entry.needsReview).length);
	const selected = $derived(roster.find((entry) => entry.id === selectedId) ?? null);
	const historyRows = $derived(
		tracker.history.filter(
			(session) => !historyParticipant || session.participants.some((p) => p.id === historyParticipant)
		)
	);
	const pageError = $derived(tracker.combinedError);

	// Follow the Convex archive while this dashboard is open.
	$effect(() => {
		cloudHistory.follow();
		return () => cloudHistory.stop();
	});
	const filtersActive = $derived(search.trim() !== '' || filter !== 'all');

	function openParticipant(id: string) {
		selectedId = id;
		participantOpen = true;
	}

	function clearFilters() {
		search = '';
		filter = 'all';
	}

	function saveNextTarget(id: string, target: number) {
		nextTargets = { ...nextTargets, [id]: target };
		notice = `${id} next session target set to ${target}.`;
	}

	async function startSession(setup: SessionSetup) {
		notice = '';
		endError = '';
		const workout = await tracker.start(setup);
		notice = `${workout.exercise_label} session started for ${workout.participants.length} participants.`;
		monitorOpen = true;
	}

	async function endSession() {
		if (!tracker.session) return;
		endError = '';
		try {
			const saved = await tracker.finish(tracker.session.id);
			monitorOpen = false;
			summary = saved;
			notice = 'Session saved to history. Cloud upload runs in the background.';
		} catch (cause) {
			endError = cause instanceof Error ? cause.message : 'Could not save the session. Try End & save again.';
		}
	}

	async function retryCamera() {
		if (!tracker.session) return;
		endError = '';
		try {
			await tracker.retryCamera(tracker.session.id);
		} catch (cause) {
			endError = cause instanceof Error ? cause.message : 'Could not restart the camera.';
		}
	}

	function prepare() {
		if (tracker.session) monitorOpen = true;
		else setupOpen = true;
	}
</script>

<svelte:head>
	<title>Sessions · Alder</title>
</svelte:head>

<PortalShell role="admin">
	<PageHeading
		title="Sessions"
		description="Run group sessions and review every participant’s progress."
	>
		{#snippet actions()}
			<Button variant="outline" size="sm" onclick={() => (tab = 'sessions')}>History</Button>
			<Button
				size="sm"
				onclick={prepare}
				disabled={tracker.loading || tracker.busy || !tracker.connected || !tracker.exercises.length}
			>
				<HugeiconsIcon icon={tracker.session ? PlayIcon : Add01Icon} size={16} strokeWidth={2} data-icon="inline-start" />
				{tracker.session ? 'View live session' : 'Prepare a session'}
			</Button>
		{/snippet}
	</PageHeading>

	{#if pageError}
		<Alert variant="destructive" role="alert">
			<HugeiconsIcon icon={Alert02Icon} size={18} strokeWidth={2} />
			<AlertTitle>{tracker.error ? 'Tracker unavailable' : 'Convex unavailable'}</AlertTitle>
			<AlertDescription>{pageError}</AlertDescription>
		</Alert>
	{/if}

	{#if notice}
		<Alert variant="success" role="status" class="pr-24">
			<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} />
			<AlertDescription>{notice}</AlertDescription>
			<Button variant="ghost" size="xs" class="absolute top-1/2 right-3 -translate-y-1/2" onclick={() => (notice = '')}>Dismiss</Button>
		</Alert>
	{/if}

	{#if tracker.session}
		<Card variant="feature" class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<div class="flex items-center gap-2"><p class="eyebrow">Active session</p><Badge variant="success"><LiveDot />Live</Badge></div>
				<h2 class="truncate text-lg font-semibold tracking-tight">
					{tracker.session.exercise_label} · {tracker.session.station}
				</h2>
				<p class="text-muted-foreground text-sm">
					{tracker.session.participants.length} participants · {sourceNames[tracker.session.source]}
				</p>
			</div>
			<div class="w-full sm:w-44"><p class="mb-1 text-xs text-muted-foreground"><span class="font-mono text-foreground">{totalReps(tracker.session)} / {totalTarget(tracker.session)}</span> reps</p><Progress value={totalReps(tracker.session)} max={Math.max(totalTarget(tracker.session), 1)} class="h-1.5" /></div>
			<Button variant="outline" size="sm" onclick={() => (monitorOpen = true)}>Open monitor</Button>
		</Card>
	{/if}

	<section class="grid gap-3 sm:grid-cols-3" aria-label="Summary">
		<StatCard
			label="Participant IDs"
			value={roster.length}
			hint="Across all sessions"
			icon={UserMultipleIcon}
			loading={tracker.loading}
		/>
		<StatCard
			label="Saved sessions"
			value={tracker.history.length}
			hint="Completed reports"
			icon={ClipboardCheckIcon}
			tone="accent"
			loading={tracker.historyLoading && !tracker.history.length}
		/>
		<StatCard
			label="Review needed"
			value={reviewCount}
			hint="Needs attention"
			icon={Alert02Icon}
			tone="clay"
			loading={tracker.loading}
		/>
	</section>

	<Tabs.Root bind:value={tab} class="gap-0">
		<Tabs.List aria-label="Dashboard sections" class="w-fit max-w-full">
			<Tabs.Trigger value="participants" class="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[var(--shadow-sm),var(--highlight)] dark:data-[state=active]:bg-white/8">Participants</Tabs.Trigger>
			<Tabs.Trigger value="sessions" class="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[var(--shadow-sm),var(--highlight)] dark:data-[state=active]:bg-white/8">Session history</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="participants" class="flex flex-col gap-4 pt-4">
			<div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
					<div class="relative">
						<HugeiconsIcon
							icon={Search01Icon}
							size={16}
							strokeWidth={2}
							class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
						/>
						<Input
							type="search"
							class="h-10 w-full pl-9 sm:w-56"
							placeholder="Search ID"
							aria-label="Search participants"
							bind:value={search}
						/>
					</div>
					<Select.Root type="single" value={filter} onValueChange={(value) => (filter = value as RosterFilter)}>
						<Select.Trigger aria-label="Filter participants" class="w-full sm:w-44"><span class="truncate">{filter === 'review' ? 'Needs review' : 'All participants'}</span></Select.Trigger>
						<Select.Content><Select.Item value="all" label="All participants" /><Select.Item value="review" label="Needs review" /></Select.Content>
					</Select.Root>
				</div>

			{#if tracker.loading && !tracker.history.length}
				<div class="flex flex-col gap-3" aria-label="Loading participants" role="status">
					{#each Array.from({ length: 4 }, (_, i) => i) as row (row)}
						<Skeleton class="h-14 w-full" />
					{/each}
				</div>
			{:else if visibleRoster.length}
				<Card class="gap-0 p-0 py-0"><RosterTable entries={visibleRoster} onSelect={openParticipant} /></Card>
			{:else}
				<Empty.Root><Empty.Header><Empty.Media variant="icon"><HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={2} /></Empty.Media><h3 class="font-semibold">No participants match this search.</h3></Empty.Header>{#if filtersActive}<Empty.Content><Button variant="outline" size="sm" onclick={clearFilters}>Clear filters</Button></Empty.Content>{/if}</Empty.Root>
			{/if}

			<p class="text-muted-foreground text-xs">
				Showing {visibleRoster.length} of {roster.length} IDs
			</p>
		</Tabs.Content>

		<Tabs.Content value="sessions" class="flex flex-col gap-4 pt-4">
			<div class="flex justify-start sm:justify-end">
				<Select.Root type="single" value={historyParticipant || 'all'} onValueChange={(value) => (historyParticipant = value === 'all' ? '' : value)}>
					<Select.Trigger aria-label="Filter sessions by participant" class="w-full sm:w-48"><span class="truncate">{historyParticipant || 'All participants'}</span></Select.Trigger>
					<Select.Content><Select.Item value="all" label="All participants" />{#each roster as entry (entry.id)}<Select.Item value={entry.id} label={entry.id} />{/each}</Select.Content>
				</Select.Root>
			</div>

			{#if historyRows.length}
				<Card class="gap-0 p-0 py-0"><HistoryTable sessions={historyRows} onView={(session) => (summary = session)} /></Card>
				{#if tracker.historyHasMore}
					<Button variant="outline" class="self-center" onclick={() => tracker.loadMoreHistory()}>Load more sessions</Button>
				{/if}
			{:else}
				<Empty.Root><Empty.Header><Empty.Media variant="icon"><HugeiconsIcon icon={Calendar03Icon} size={20} strokeWidth={2} /></Empty.Media><h3 class="font-semibold">{tracker.historyLoading ? 'Loading saved sessions…' : 'No completed sessions yet.'}</h3>{#if !tracker.historyLoading}<Empty.Description>End and save a session to see its report here.</Empty.Description>{/if}</Empty.Header></Empty.Root>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</PortalShell>

<ParticipantDialog
	entry={selected}
	bind:open={participantOpen}
	nextTarget={selected ? (nextTargets[selected.id] ?? 10) : 10}
	onSaveTarget={saveNextTarget}
/>

<SessionSetupDialog
	bind:open={setupOpen}
	exercises={tracker.exercises}
	maxLanes={tracker.maxLanes}
	{nextTargets}
	blocked={!tracker.connected || Boolean(tracker.session)}
	busy={tracker.busy}
	onStart={startSession}
/>

<LiveMonitorDialog
	bind:open={monitorOpen}
	session={tracker.session}
	busy={tracker.busy}
	error={endError}
	onEnd={endSession}
	onRetryCamera={retryCamera}
/>

<Dialog.Root
	open={summary !== null}
	onOpenChange={(open) => {
		if (!open) summary = null;
	}}
>
	<Dialog.Content class="max-h-[90svh] overflow-y-auto sm:max-w-3xl" bind:ref={summaryContent} onOpenAutoFocus={(event) => { event.preventDefault(); summaryContent?.focus(); }}>
		<Dialog.Header class="gap-1">
			<Dialog.Title class="text-xl">Session summary</Dialog.Title>
			<Dialog.Description>Results for each participant.</Dialog.Description>
		</Dialog.Header>
		{#if summary}
			<WorkoutSummary workout={summary} />
		{/if}
	</Dialog.Content>
</Dialog.Root>
