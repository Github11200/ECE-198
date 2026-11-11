<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Tick02Icon } from '@hugeicons/core-free-icons';
	import ResultNotes from '../result-notes.svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { MAX_REP_TARGET, participantLabel, type RosterEntry } from '#lib/dashboard.js';
	import { percent, sourceNames } from '#lib/tracker-api.js';

	let {
		entry,
		open = $bindable(false),
		nextTarget,
		onSaveTarget
	}: {
		entry: RosterEntry | null;
		open?: boolean;
		nextTarget: number;
		onSaveTarget: (id: string, target: number) => void;
	} = $props();

	let draft = $state<number | null>(null);
	let error = $state('');

	// Re-seed the field whenever a different participant is opened.
	$effect(() => {
		if (entry) {
			draft = nextTarget;
			error = '';
		}
	});

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!entry) return;
		if (draft === null || !Number.isInteger(draft) || draft < 1 || draft > MAX_REP_TARGET) {
			error = `Enter a whole number from 1 to ${MAX_REP_TARGET}.`;
			return;
		}
		onSaveTarget(entry.id, draft);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90svh] overflow-y-auto sm:max-w-xl">
		{#if entry}
			<Dialog.Header class="gap-1">
				<Dialog.Title class="text-xl">{participantLabel(entry.id)}</Dialog.Title>
				<Dialog.Description>
					{entry.id}{entry.live && entry.result ? ` · lane ${entry.result.lane}` : ''}
				</Dialog.Description>
			</Dialog.Header>

			<dl class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<dt class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Saved sessions</dt>
					<dd class="mt-1 text-base font-semibold tabular-nums">{entry.visits}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Latest exercise</dt>
					<dd class="mt-1 font-semibold">{entry.workout?.exercise_label ?? 'Not recorded'}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Reps / target</dt>
					<dd class="mt-1 font-semibold tabular-nums">
						{entry.result ? `${entry.result.reps} / ${entry.result.target}` : 'Not recorded'}
					</dd>
				</div>
				<div>
					<dt class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Range score</dt>
					<dd class="mt-1 font-semibold tabular-nums">{percent(entry.result?.range_score)}</dd>
				</div>
			</dl>

			{#if entry.workout}
				<p class="text-muted-foreground -mt-2 text-xs">Source: {sourceNames[entry.workout.source]}</p>
			{/if}

			{#if entry.result}
				<section class="flex flex-col gap-3" aria-labelledby="measurement-notes">
					<h3 id="measurement-notes" class="text-sm font-semibold">Measurement notes</h3>
					<ResultNotes person={entry.result} />
				</section>
			{/if}

			<form class="border-t pt-5" onsubmit={save} novalidate>
				<div class="grid gap-2">
					<Label for="next-target">Next session rep target</Label>
					<div class="flex flex-col gap-2 sm:flex-row">
						<Input
							id="next-target"
							type="number"
							min="1"
							max={MAX_REP_TARGET}
							step="1"
							inputmode="numeric"
							class="h-11 sm:max-w-40"
							aria-invalid={error ? 'true' : undefined}
							aria-describedby="next-target-help"
							value={draft ?? ''}
							oninput={(event) => {
								const value = (event.currentTarget as HTMLInputElement).valueAsNumber;
								draft = Number.isNaN(value) ? null : value;
							}}
						/>
						<Button type="submit" size="lg" class="sm:ml-auto">
							<HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.2} data-icon="inline-start" />
							Use target
						</Button>
					</div>
					<p id="next-target-help" class="text-muted-foreground text-xs leading-relaxed">
						Applies to the next session setup. Starting a session saves its target snapshot.
					</p>
					{#if error}
						<p class="text-destructive text-sm font-medium" role="alert">{error}</p>
					{/if}
				</div>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
