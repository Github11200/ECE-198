<script lang="ts">
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
	import { Alert, AlertDescription, AlertTitle } from '#lib/components/ui/alert/index.js';
	import { buildRoster, filterRoster, type RosterFilter } from '#lib/dashboard.js';
	import { tracker } from '#lib/tracker.svelte.js';
	import { cloudHistory } from '#lib/cloud-history.svelte.js';
	import { sourceNames, type SessionSetup, type Workout } from '#lib/tracker-api.js';

	let search = $state('');
	let filter = $state<RosterFilter>('all');
	let tab = $state('participants');
	let historyParticipant = $state('');
	let selectedId = $state<string | null>(null);
	let participantOpen = $state(false);
	let setupOpen = $state(false);
	let monitorOpen = $state(false);
	let summary = $state<Workout | null>(null);
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
	const pageError = $derived(endError || tracker.combinedError);

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
			notice = 'Session stopped and queued for upload. It will appear in history when Convex confirms the save.';
		} catch (cause) {
			endError = cause instanceof Error ? cause.message : 'Could not save the session. Try End & save again.';
		}
	}

	function prepare() {
		if (tracker.session) monitorOpen = true;
		else setupOpen = true;
	}
</script>

<svelte:head>
	<title>Admin dashboard · Alder Rehabilitation</title>
</svelte:head>

<PortalShell role="admin">
	<PageHeading
		eyebrow="Instructor workspace"
		title="Session overview"
		description="Set individual targets and follow each participant’s progress across group sessions."
	>
		{#snippet actions()}
			<Button
				size="lg"
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
			<AlertTitle>Tracker unavailable</AlertTitle>
			<AlertDescription>{pageError}</AlertDescription>
		</Alert>
	{/if}

	{#if notice}
		<div
			class="border-success/30 bg-success/10 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
			role="status"
		>
			<span class="flex items-start gap-2.5">
				<HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} class="text-success mt-0.5 shrink-0" />
				{notice}
			</span>
			<Button variant="ghost" size="sm" onclick={() => (notice = '')}>Dismiss</Button>
		</div>
	{/if}

	{#if tracker.session}
		<Card class="flex-row items-center gap-4 p-5 sm:p-6">
			<span class="bg-primary/10 text-primary grid size-12 shrink-0 place-items-center rounded-xl">
				<HugeiconsIcon icon={PlayIcon} size={22} strokeWidth={2} />
			</span>
			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				<p class="eyebrow">Active session</p>
				<h2 class="truncate text-lg font-bold tracking-tight">
					{tracker.session.exercise_label} · {tracker.session.station}
				</h2>
				<p class="text-muted-foreground text-sm">
					{tracker.session.participants.length} participants · {sourceNames[tracker.session.source]}
				</p>
			</div>
			<Button variant="outline" onclick={() => (monitorOpen = true)}>Open monitor</Button>
		</Card>
	{/if}

	<section class="grid gap-4 sm:grid-cols-3" aria-label="Summary">
		<StatCard
			label="Participant IDs"
			value={roster.length}
			hint="Assign IDs to camera lanes before starting"
			icon={UserMultipleIcon}
			loading={tracker.loading}
		/>
		<StatCard
			label="Saved sessions"
			value={tracker.history.length}
			hint="Completed workout reports"
			icon={ClipboardCheckIcon}
			tone="accent"
			loading={tracker.historyLoading && !tracker.history.length}
		/>
		<StatCard
			label="Review needed"
			value={reviewCount}
			hint="Range, target or tracking notes"
			icon={Alert02Icon}
			tone="clay"
			loading={tracker.loading}
		/>
	</section>

	<Tabs.Root bind:value={tab} class="gap-0">
		<Tabs.List variant="line" class="border-border w-full justify-start gap-6 rounded-none border-b" aria-label="Dashboard sections">
			<Tabs.Trigger value="participants" class="h-10 flex-none px-0 text-sm font-semibold">Participants</Tabs.Trigger>
			<Tabs.Trigger value="sessions" class="h-10 flex-none px-0 text-sm font-semibold">Session history</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="participants" class="flex flex-col gap-5 pt-6">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 class="text-lg font-bold tracking-tight">Participants</h2>
					<p class="text-muted-foreground text-sm">Current session or most recent saved results</p>
				</div>
				<div class="flex flex-col gap-2 sm:flex-row">
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
							placeholder="Search participant ID"
							aria-label="Search participants"
							bind:value={search}
						/>
					</div>
					<select
						class="border-input bg-background focus-visible:ring-ring/50 h-10 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] sm:w-44"
						aria-label="Filter participants"
						bind:value={filter}
					>
						<option value="all">All participants</option>
						<option value="review">Needs review</option>
					</select>
				</div>
			</div>

			{#if tracker.loading && !tracker.history.length}
				<div class="flex flex-col gap-3" aria-label="Loading participants" role="status">
					{#each Array.from({ length: 4 }, (_, i) => i) as row (row)}
						<Skeleton class="h-14 w-full" />
					{/each}
				</div>
			{:else if visibleRoster.length}
				<RosterTable entries={visibleRoster} onSelect={openParticipant} />
			{:else}
				<div class="flex flex-col items-center gap-3 py-16 text-center">
					<span class="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
						<HugeiconsIcon icon={Search01Icon} size={22} strokeWidth={1.8} />
					</span>
					<h3 class="font-semibold">No participants match this search.</h3>
					{#if filtersActive}
						<Button variant="link" onclick={clearFilters}>Clear filters</Button>
					{/if}
				</div>
			{/if}

			<p class="text-muted-foreground text-xs">
				Showing {visibleRoster.length} of {roster.length} IDs · IDs stay with participants across sessions
			</p>
		</Tabs.Content>

		<Tabs.Content value="sessions" class="flex flex-col gap-5 pt-6">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h2 class="text-lg font-bold tracking-tight">Completed group sessions</h2>
					<p class="text-muted-foreground text-sm">Saved results for every group session, with each input source.</p>
				</div>
				<select
					class="border-input bg-background focus-visible:ring-ring/50 h-10 min-w-44 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
					aria-label="Filter sessions by participant"
					bind:value={historyParticipant}
				>
					<option value="">All participants</option>
					{#each roster as entry (entry.id)}
						<option value={entry.id}>{entry.id}</option>
					{/each}
				</select>
			</div>

			{#if historyRows.length}
				<HistoryTable sessions={historyRows} onView={(session) => (summary = session)} />
				{#if tracker.historyHasMore}
					<Button variant="outline" class="self-center" onclick={() => tracker.loadMoreHistory()}>Load more sessions</Button>
				{/if}
			{:else}
				<div class="flex flex-col items-center gap-3 py-16 text-center">
					<span class="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
						<HugeiconsIcon icon={Calendar03Icon} size={22} strokeWidth={1.8} />
					</span>
					<h3 class="font-semibold">
						{tracker.historyLoading ? 'Loading saved sessions…' : 'No completed sessions yet.'}
					</h3>
					{#if !tracker.historyLoading}
						<p class="text-muted-foreground max-w-sm text-sm">End and save a workout to generate its report.</p>
					{/if}
				</div>
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
	onEnd={endSession}
/>

<Dialog.Root
	open={summary !== null}
	onOpenChange={(open) => {
		if (!open) summary = null;
	}}
>
	<Dialog.Content class="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
		<Dialog.Header class="gap-1">
			<Dialog.Title class="text-xl">Session summary</Dialog.Title>
			<Dialog.Description>Review each participant’s results before printing the report.</Dialog.Description>
		</Dialog.Header>
		{#if summary}
			<WorkoutSummary workout={summary} />
		{/if}
	</Dialog.Content>
</Dialog.Root>
