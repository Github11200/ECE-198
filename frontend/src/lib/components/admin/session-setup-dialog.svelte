<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { PlayIcon, CheckmarkCircle02Icon, Alert02Icon } from '@hugeicons/core-free-icons';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import {
		DEFAULT_PARTICIPANT_IDS,
		validateLanes,
		type LaneDraft
	} from '#lib/dashboard.js';
	import {
		sourceNames,
		type Exercise,
		type Source,
		type SessionSetup
	} from '#lib/tracker-api.js';

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

	const selectClass =
		'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-11 w-full rounded-lg border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50';

	const sourceHelp: Record<Source, string> = {
		camera:
			'Start the session, then run the AlphaPose camera bridge on this laptop. Its preview opens in a separate window.',
		replay:
			'Generated joint coordinates run through the backend scorer for five seconds. No camera required.',
		recording:
			'Start the session, then send your saved AlphaPose COCO JSON using the recording bridge.'
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

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
		<Dialog.Header class="gap-1">
			<Dialog.Title class="text-xl">Prepare a group session</Dialog.Title>
			<Dialog.Description>
				Assign a participant ID to each camera lane, from left to right. Each person stays in that lane while the session runs.
			</Dialog.Description>
		</Dialog.Header>

		{#if blocked && !busy}
			<p
				class="border-warning/40 bg-warning/10 text-foreground flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm"
				role="status"
			>
				<HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={2} class="text-warning-foreground mt-0.5 shrink-0" />
				Setup is paused. Reconnect to the tracker, or close the active session monitor first.
			</p>
		{/if}

		{#if error}
			<p class="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3.5 py-2.5 text-sm font-medium" role="alert">
				{error}
			</p>
		{/if}

		<form class="flex flex-col gap-6" onsubmit={submit} novalidate>
			<fieldset class="grid gap-4 sm:grid-cols-2" {disabled}>
				<div class="grid gap-2">
					<Label for="setup-station">Station</Label>
					<Input id="setup-station" class="h-11" maxlength={60} required bind:value={station} />
				</div>
				<div class="grid gap-2">
					<Label for="setup-exercise">Exercise</Label>
					<select id="setup-exercise" class={selectClass} value={exercise?.id ?? ''} onchange={(event) => (exerciseId = event.currentTarget.value)}>
						{#each exercises as item (item.id)}
							<option value={item.id}>{item.label}</option>
						{/each}
					</select>
				</div>
				<div class="grid gap-2">
					<Label for="setup-source">Pose input</Label>
					<select id="setup-source" class={selectClass} bind:value={source}>
						{#each Object.entries(sourceNames) as [value, label] (value)}
							<option {value}>{label}</option>
						{/each}
					</select>
				</div>
				<div class="grid gap-2">
					<Label for="setup-lanes">Participants</Label>
					<select
						id="setup-lanes"
						class={selectClass}
						value={lanes.length}
						onchange={(event) => setLaneCount(Number(event.currentTarget.value))}
					>
						{#each Array.from({ length: maxLanes }, (_, i) => i + 1) as count (count)}
							<option value={count}>{count}</option>
						{/each}
					</select>
				</div>
			</fieldset>

			<div class="text-foreground grid gap-2 text-sm leading-relaxed">
				{#if exercise}
					<p>{exercise.help}</p>
					<p class="text-muted-foreground">Fixed angles: {exercise.criteria}</p>
				{/if}
				<p class="text-muted-foreground">{sourceHelp[source]}</p>
			</div>

			<fieldset class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" {disabled}>
				<legend class="sr-only">Camera lanes</legend>
				{#each lanes as lane, index (index)}
					<div class="flex flex-col gap-3">
						<p class="text-sm font-semibold">Camera lane {index + 1}</p>
						<div class="grid gap-1.5">
							<Label for={`lane-${index}-id`} class="text-muted-foreground text-xs">Participant ID</Label>
							<Input
								id={`lane-${index}-id`}
								class="h-11 uppercase"
								maxlength={3}
								pattern="P(0[1-9]|[1-9][0-9])"
								required
								bind:value={lane.id}
							/>
						</div>
						<div class="grid gap-1.5">
							<Label for={`lane-${index}-target`} class="text-muted-foreground text-xs">Rep target</Label>
							<Input
								id={`lane-${index}-target`}
								type="number"
								min="1"
								max="99"
								step="1"
								inputmode="numeric"
								class="h-11"
								required
								bind:value={lane.target}
							/>
						</div>
					</div>
				{/each}
			</fieldset>

			<p class="text-muted-foreground text-xs leading-relaxed">
				IDs P01–P99 are assigned manually. The camera does not recognise identities.
			</p>

			<Dialog.Footer class="gap-2 sm:justify-between">
				<p class="text-muted-foreground flex items-center gap-1.5 text-xs">
					<HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} class="text-success" />
					Targets do not end the session automatically.
				</p>
				<Button type="submit" size="lg" disabled={disabled || !exercise}>
					<HugeiconsIcon icon={PlayIcon} size={16} strokeWidth={2} data-icon="inline-start" />
					{busy ? 'Starting…' : source === 'replay' ? 'Start replay' : 'Start session'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
