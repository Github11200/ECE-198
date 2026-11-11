<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Tick02Icon } from '@hugeicons/core-free-icons';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { percent, sourceNames, type Workout } from '#lib/tracker-api.js';

	let {
		open = $bindable(false),
		session,
		busy,
		onEnd
	}: {
		open?: boolean;
		session: Workout | null;
		busy: boolean;
		onEnd: () => void;
	} = $props();

	let previewId = $state<string | null>(null);
	const preview = $derived(
		session?.participants.find((person) => person.id === previewId) ?? session?.participants[0] ?? null
	);
	const usable = $derived(session ? session.participants.filter((p) => p.angle != null).length : 0);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
		{#if session}
			<Dialog.Header class="gap-1">
				<Dialog.Title class="text-xl">{session.exercise_label} · {session.station}</Dialog.Title>
				<Dialog.Description>
					{session.criteria.description}
					<span class="block pt-1 text-xs">
						{sourceNames[session.source]} · {usable} of {session.participants.length} lanes have a usable pose.
					</span>
				</Dialog.Description>
			</Dialog.Header>

			{#if session.replay_done}
				<p class="border-success/30 bg-success/10 text-foreground rounded-lg border px-3.5 py-2.5 text-sm" role="status">
					Replay complete. End &amp; save to generate the report.
				</p>
			{/if}

			<div class="grid gap-5 md:grid-cols-[1fr_1.1fr]">
				{#if preview}
					<section
						class="flex flex-col gap-3 md:border-r md:pr-6"
						aria-label="Participant feedback"
						aria-live="polite"
					>
						<div class="flex items-center justify-between gap-3">
							<span class="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs font-semibold">
								{preview.id} · Lane {preview.lane}
							</span>
							<span class="text-muted-foreground text-xs">Range {percent(preview.range_score)}</span>
						</div>
						<p class="text-4xl font-bold tracking-tight tabular-nums">
							{preview.angle == null ? '—' : `${preview.angle}°`}
						</p>
						<p class="text-muted-foreground text-sm">
							{session.criteria.angle_label}{preview.angle == null ? ' unavailable' : ''}
						</p>
						<p class="text-lg font-semibold tabular-nums">{preview.reps} / {preview.target} reps</p>
						<Progress class="h-2" value={preview.reps} max={Math.max(preview.target, 1)} aria-label={`${preview.id} rep progress`} />
						<p class="text-sm leading-relaxed">{preview.cue}</p>
						{#if preview.tracking_reason}
							<p class="text-muted-foreground text-xs leading-relaxed">{preview.tracking_reason}</p>
						{/if}
					</section>
				{/if}

				<ul class="flex flex-col divide-y" aria-label="Live roster">
					{#each session.participants as person (person.id)}
						<li>
							<button
								type="button"
								aria-pressed={person.id === preview?.id}
								onclick={() => (previewId = person.id)}
								class={`focus-visible:ring-ring/50 -mx-2 flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-3 text-left outline-none transition-colors focus-visible:ring-[3px] ${
									person.id === preview?.id ? 'bg-muted/60' : 'hover:bg-muted/40'
								}`}
							>
								<span class="bg-accent text-accent-foreground grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums" aria-hidden="true">{person.lane}</span>
								<span class="flex min-w-0 flex-1 flex-col gap-1">
									<span class="text-sm font-semibold">{person.id} · Participant {person.id.slice(1)}</span>
									<span class="text-muted-foreground truncate text-xs">
										{person.angle == null ? person.tracking_reason : person.cue}
									</span>
									<span class="text-muted-foreground truncate text-xs">{person.last_range || 'No completed attempt yet'}</span>
								</span>
								<span class="text-right text-base font-bold tabular-nums">
									{person.reps}<span class="text-muted-foreground text-xs font-medium"> / {person.target}</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</div>

			<p class="text-muted-foreground text-xs leading-relaxed">
				Counts are independent. Targets do not end the session automatically. Closing this monitor keeps the session running.
			</p>

			<Dialog.Footer class="gap-2 sm:justify-end">
				<Button variant="outline" size="lg" onclick={() => (open = false)}>Close monitor</Button>
				<Button size="lg" disabled={busy} onclick={onEnd}>
					<HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.2} data-icon="inline-start" />
					{busy ? 'Saving…' : 'End & save session'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
