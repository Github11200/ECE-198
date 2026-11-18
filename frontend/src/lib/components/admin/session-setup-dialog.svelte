<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Alert02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { DEFAULT_PARTICIPANT_IDS, validateLanes, type LaneDraft } from '#lib/dashboard.js';
	import { sourceNames, sourceShortNames, type Exercise, type Source, type SessionSetup } from '#lib/tracker-api.js';

	let {
		open = $bindable(false),
		exercises,
		maxLanes,
		nextTargets,
		blocked,
		busy,
		onStart
	}: {
		open?: boolean;
		exercises: Exercise[];
		maxLanes: number;
		nextTargets: Record<string, number>;
		/** True when the tracker is disconnected or another session is already running. */
		blocked: boolean;
		busy: boolean;
		onStart: (setup: SessionSetup) => Promise<unknown>;
	} = $props();

	const sourceHelp: Record<Source, string> = {
		camera: 'Starts live camera tracking. Wait for the preview before exercising.',
		replay: 'Runs sample joint data through the scorer for five seconds.',
		recording: 'Send saved joint data through the recording bridge after starting.'
	};

	let station = $state('Station 1');
	let exerciseId = $state('');
	let source = $state<Source>('camera');
	let lanes = $state<LaneDraft[]>(
		DEFAULT_PARTICIPANT_IDS.slice(0, 3).map((id) => ({ id, target: 10 }))
	);
	let error = $state('');

	const exercise = $derived(exercises.find((item) => item.id === exerciseId) ?? exercises[0] ?? null);
	const disabled = $derived(busy || blocked);

	// Each time the dialog opens, targets come from every participant's saved
	// next-session target, so a change made in the participant view is used here.
	let wasOpen = false;
	$effect(() => {
		if (open && !wasOpen) {
			lanes = lanes.map((lane) => ({ id: lane.id, target: nextTargets[lane.id] ?? 10 }));
			error = '';
		}
		wasOpen = open;
	});

	function newLane(index: number): LaneDraft {
		const id = DEFAULT_PARTICIPANT_IDS[index] ?? `P${String(index + 1).padStart(2, '0')}`;
		return { id, target: nextTargets[id] ?? 10 };
	}

	function setLaneCount(count: number) {
		lanes = Array.from({ length: count }, (_, index) => lanes[index] ?? newLane(index));
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		const normalized = lanes.map((lane) => ({
			id: lane.id.trim().toUpperCase(),
			target: lane.target ?? Number.NaN
		}));
		lanes = normalized;

		if (!exercise) {
			error = 'Choose an exercise before starting.';
			return;
		}
		if (!station.trim()) {
			error = 'Enter a station name.';
			return;
		}
		const problem = validateLanes(normalized, maxLanes);
		if (problem) {
			error = problem;
			return;
		}

		try {
			await onStart({
				source,
				exercise: exercise.id,
				station: station.trim(),
				participant_ids: normalized.map((lane) => lane.id),
				targets: normalized.map((lane) => lane.target)
			});
			open = false;
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not start the session.';
		}
	}
</script>

<Tooltip.Provider>
	<Dialog.Root bind:open>
		<Dialog.Content class="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
			<Dialog.Header class="gap-1">
				<Dialog.Title class="text-xl tracking-tight">Prepare a group session</Dialog.Title>
				<Dialog.Description>Assign an ID and rep target to each lane, left to right.</Dialog.Description>
			</Dialog.Header>

			{#if blocked && !busy}
				<Alert.Root variant="warning" role="status">
					<HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={2} />
					<Alert.Description>Setup is paused. Reconnect to the tracker or close the active session first.</Alert.Description>
				</Alert.Root>
			{/if}
			{#if error}
				<Alert.Root variant="destructive" role="alert">
					<HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={2} />
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}

			<form class="flex min-w-0 flex-col gap-5" onsubmit={submit} novalidate>
				<fieldset class="grid min-w-0 gap-4 sm:grid-cols-2" {disabled}>
					<div class="grid min-w-0 gap-2">
						<Label for="setup-station">Station</Label>
						<Input id="setup-station" maxlength={60} required bind:value={station} />
					</div>
					<div class="grid min-w-0 gap-2">
						<div class="flex items-center gap-1.5">
							<Label for="setup-exercise">Exercise</Label>
							{#if exercise}
								<Tooltip.Root><Tooltip.Trigger aria-label="Exercise criteria" class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex rounded-full outline-none focus-visible:ring-[3px]"><HugeiconsIcon icon={InformationCircleIcon} size={14} strokeWidth={2} /></Tooltip.Trigger><Tooltip.Content>{exercise.criteria}</Tooltip.Content></Tooltip.Root>
							{/if}
						</div>
						<Select.Root type="single" value={exercise?.id ?? ''} onValueChange={(value) => (exerciseId = value)}>
							<Select.Trigger id="setup-exercise" aria-label="Exercise" class="w-full"><span class="truncate">{exercise?.label ?? 'Choose exercise'}</span></Select.Trigger>
							<Select.Content>{#each exercises as item (item.id)}<Select.Item value={item.id} label={item.label} />{/each}</Select.Content>
						</Select.Root>
						{#if exercise}<p class="text-muted-foreground truncate text-xs" title={exercise.help}>{exercise.help}</p>{/if}
					</div>
					<div class="grid min-w-0 gap-2">
						<div class="flex items-center gap-1.5">
							<Label>Pose input</Label>
							<Tooltip.Root><Tooltip.Trigger aria-label="About pose input" class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex rounded-full outline-none focus-visible:ring-[3px]"><HugeiconsIcon icon={InformationCircleIcon} size={14} strokeWidth={2} /></Tooltip.Trigger><Tooltip.Content>{sourceHelp[source]}</Tooltip.Content></Tooltip.Root>
						</div>
						<div class="max-w-full overflow-x-auto">
							<Tabs.Root value={source} onValueChange={(value) => (source = value as Source)}>
								<Tabs.List aria-label="Pose input">{#each Object.keys(sourceNames) as value (value)}<Tabs.Trigger {value} class="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[var(--shadow-sm),var(--highlight)] dark:data-[state=active]:bg-white/8">{sourceShortNames[value as Source]}</Tabs.Trigger>{/each}</Tabs.List>
								<Tabs.Content value={source} class="sr-only">{sourceShortNames[source]} selected</Tabs.Content>
							</Tabs.Root>
						</div>
					</div>
					<div class="grid min-w-0 gap-2">
						<Label>Participants</Label>
						<div class="max-w-full overflow-x-auto">
							<Tabs.Root value={String(lanes.length)} onValueChange={(value) => setLaneCount(Number(value))}>
								<Tabs.List aria-label="Participants">{#each Array.from({ length: maxLanes }, (_, i) => i + 1) as count (count)}<Tabs.Trigger value={String(count)} class="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[var(--shadow-sm),var(--highlight)] dark:data-[state=active]:bg-white/8">{count}</Tabs.Trigger>{/each}</Tabs.List>
								<Tabs.Content value={String(lanes.length)} class="sr-only">{lanes.length} lanes selected</Tabs.Content>
							</Tabs.Root>
						</div>
					</div>
				</fieldset>

				<fieldset {disabled} class="min-w-0">
					<legend class="sr-only">Camera lanes</legend>
					<Card.Root variant="inset" class="min-w-0 gap-0 py-0">
						<div class="text-muted-foreground border-border/70 grid grid-cols-[2.5rem_minmax(0,1fr)_5.75rem] gap-2 border-b px-3 py-2 sm:grid-cols-[3rem_minmax(0,1fr)_7rem] sm:gap-3 sm:px-4">
							<span class="eyebrow">Lane</span><span class="eyebrow">Participant ID</span><span class="eyebrow">Rep target</span>
						</div>
						{#each lanes as lane, index (index)}
							<div class="border-border/70 grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_5.75rem] items-center gap-2 border-b px-3 py-2 last:border-b-0 sm:grid-cols-[3rem_minmax(0,1fr)_7rem] sm:gap-3 sm:px-4">
								<span class="bg-card grid size-8 place-items-center rounded-full font-mono text-xs font-semibold tabular-nums" aria-hidden="true">{index + 1}</span>
								<div class="min-w-0">
									<Label for={`lane-${index}-id`} class="sr-only">Participant ID</Label>
									<Input id={`lane-${index}-id`} class="w-full uppercase" maxlength={3} pattern="P(0[1-9]|[1-9][0-9])" required bind:value={lane.id} />
								</div>
								<div class="min-w-0">
									<Label for={`lane-${index}-target`} class="sr-only">Rep target</Label>
									<Input id={`lane-${index}-target`} type="number" min="1" max="99" step="1" inputmode="numeric" class="w-full" required bind:value={lane.target} />
								</div>
							</div>
						{/each}
					</Card.Root>
				</fieldset>

				<div class="text-muted-foreground flex items-center gap-1.5 text-xs">
					<span>IDs P01–P99 are assigned manually.</span>
					<Tooltip.Root><Tooltip.Trigger aria-label="About participant IDs and targets" class="focus-visible:ring-ring/50 inline-flex shrink-0 rounded-full outline-none focus-visible:ring-[3px]"><HugeiconsIcon icon={InformationCircleIcon} size={14} strokeWidth={2} /></Tooltip.Trigger><Tooltip.Content>The camera does not recognise identities. Targets do not end the session.</Tooltip.Content></Tooltip.Root>
				</div>
				<Dialog.Footer class="border-border/70 border-t pt-4">
					<Button type="submit" size="lg" disabled={disabled || !exercise}>{busy ? 'Starting…' : source === 'replay' ? 'Start replay' : 'Start session'}</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</Tooltip.Provider>
