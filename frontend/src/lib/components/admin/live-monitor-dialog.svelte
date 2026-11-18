<script lang="ts">
	import LiveDot from '#lib/components/live-dot.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Alert02Icon, Camera01Icon, InformationCircleIcon, Tick02Icon } from '@hugeicons/core-free-icons';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { percent, sourceNames, type ParticipantResult, type Workout } from '#lib/tracker-api.js';

	let {
		open = $bindable(false),
		session: liveSession,
		busy,
		error = '',
		onEnd,
		onRetryCamera
	}: {
		open?: boolean;
		session: Workout | null;
		busy: boolean;
		/** Shown inside the dialog, since the page alert is hidden behind it. */
		error?: string;
		onEnd: () => void;
		/** Relaunch AlphaPose for a camera session whose camera failed or stopped. */
		onRetryCamera?: () => void;
	} = $props();

	// Keep the last live snapshot on screen while saving and while the dialog closes,
	// so ending a session doesn't flash the empty "no session" state.
	let lastSession = $state<Workout | null>(null);
	$effect(() => {
		if (liveSession) lastSession = liveSession;
	});
	const session = $derived(liveSession ?? (busy || !open ? lastSession : null));

	let previewId = $state<string | null>(null);
	// Focus the dialog itself on open so the info tooltips don't pop open.
	let monitorContent = $state<HTMLElement | null>(null);
	const preview = $derived(
		session?.participants.find((person) => person.id === previewId) ?? session?.participants[0] ?? null
	);
	const usable = $derived(session ? session.participants.filter((p) => p.angle != null).length : 0);
	const ringCircumference = 2 * Math.PI * 64;

	function rangeCue(person: ParticipantResult): { label: string; variant: 'warning' | 'success' | 'info' } {
		if (person.angle == null) return person.reps === 0 ? { label: 'Waiting', variant: 'info' } : { label: 'Tracking lost', variant: 'warning' };
		if (person.last_range === 'Short range') return { label: 'Short range', variant: 'warning' };
		if (person.target > 0 && person.reps >= person.target) return { label: 'Target met', variant: 'success' };
		if (person.last_range === 'Full range') return { label: 'Full range', variant: 'success' };
		return { label: 'Ready', variant: 'info' };
	}
</script>

<Tooltip.Provider>
	<Dialog.Root bind:open>
		<Dialog.Content class="max-h-[92svh] overflow-y-auto sm:max-w-5xl" bind:ref={monitorContent} onOpenAutoFocus={(event) => { event.preventDefault(); monitorContent?.focus(); }}>
			{#if session}
				<Dialog.Header class="gap-2">
					<div class="flex flex-wrap items-center gap-2">
						{#if session.replay_done}
							<Badge variant="info">Replay complete</Badge>
						{:else}
							<Badge variant="success" class="gap-1.5">
								<LiveDot />
								Live
							</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Dialog.Title class="min-w-0 text-xl tracking-tight">{session.exercise_label} · {session.station}</Dialog.Title>
						<Tooltip.Root>
							<Tooltip.Trigger aria-label="Exercise criteria" class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex shrink-0 rounded-full outline-none focus-visible:ring-[3px]">
								<HugeiconsIcon icon={InformationCircleIcon} size={16} strokeWidth={2} />
							</Tooltip.Trigger>
							<Tooltip.Content>{session.criteria.description}</Tooltip.Content>
						</Tooltip.Root>
					</div>
					<Dialog.Description class="font-mono text-xs">{sourceNames[session.source]} · {usable}/{session.participants.length} lanes tracking</Dialog.Description>
				</Dialog.Header>

				{#if error}
					<Alert.Root variant="destructive" role="alert">
						<HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={2} />
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}

				{#if session.camera}
					{@const failed = session.camera.state === 'failed'}
					<div class={['flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm', failed ? 'border-destructive/30 bg-destructive/10' : 'border-border bg-muted/50']} role="status">
						<div class="flex min-w-0 items-center gap-2.5">
							<HugeiconsIcon icon={Camera01Icon} size={16} strokeWidth={2} class={failed ? 'text-destructive shrink-0' : 'text-muted-foreground shrink-0'} />
							<Badge variant={session.camera.state === 'running' ? 'success' : session.camera.state === 'starting' ? 'info' : failed ? 'destructive' : 'warning'} class="capitalize">{session.camera.state}</Badge>
							<span class="text-muted-foreground min-w-0">{session.camera.message}</span>
						</div>
						{#if onRetryCamera && ['failed', 'paused', 'stopped'].includes(session.camera.state)}
							<Button size="sm" variant="outline" disabled={busy} onclick={onRetryCamera}>Retry camera</Button>
						{/if}
					</div>
				{/if}

				{#if session.replay_done}
					<Alert.Root variant="success" role="status">
						<HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />
						<Alert.Description>Replay complete. End &amp; save to generate the report.</Alert.Description>
					</Alert.Root>
				{/if}

				<div class="grid min-w-0 gap-5 md:grid-cols-[1.15fr_1fr]">
					{#if preview}
						<section aria-label="Participant feedback" aria-live="polite" class="min-w-0">
							<Card.Root variant="inset" class="h-full">
								<Card.Content class="flex h-full min-w-0 flex-col gap-5">
									<div class="flex flex-wrap items-center justify-between gap-2">
										<span class="rounded-full bg-card px-2.5 py-1 font-mono text-xs font-semibold">{preview.id} · Lane {preview.lane}</span>
										<Badge variant={rangeCue(preview).variant}>{rangeCue(preview).label}</Badge>
									</div>
									<div class="flex flex-wrap items-center justify-center gap-6 sm:justify-start">
										<div class="relative size-[168px] shrink-0">
											<svg viewBox="0 0 168 168" class="size-full -rotate-90" role="progressbar" aria-label={`${preview.id} rep progress`} aria-valuemin="0" aria-valuemax={Math.max(preview.target, 1)} aria-valuenow={Math.min(preview.reps, Math.max(preview.target, 1))}>
												<circle cx="84" cy="84" r="64" fill="none" stroke="color-mix(in oklab, var(--foreground) 9%, transparent)" stroke-width="10" />
												<circle cx="84" cy="84" r="64" fill="none" stroke="var(--primary)" stroke-width="10" stroke-linecap="round" stroke-dasharray={ringCircumference} stroke-dashoffset={ringCircumference * (1 - Math.min(preview.reps / Math.max(preview.target, 1), 1))} class="transition-[stroke-dashoffset] duration-[400ms] ease-out" />
											</svg>
											<div class="absolute inset-0 flex flex-col items-center justify-center">
												<span class="text-6xl font-semibold tabular-nums tracking-tight">{preview.reps}</span>
												<span class="text-muted-foreground text-xs tabular-nums">/ {preview.target} reps</span>
											</div>
										</div>
										<div class="min-w-0 text-center sm:text-left">
											<p class="stat-value tabular-nums">{preview.angle == null ? '—' : `${preview.angle}°`}</p>
											<p class="text-muted-foreground text-xs">{session.criteria.angle_label}{preview.angle == null ? ' unavailable' : ''}</p>
										</div>
									</div>
									<div class="min-w-0 space-y-1">
										<p class="text-sm font-medium">{preview.cue}</p>
										{#if preview.tracking_reason}<p class="text-muted-foreground text-xs">{preview.tracking_reason}</p>{/if}
									</div>
									<div class="border-border/70 mt-auto grid grid-cols-3 gap-2 border-t pt-4">
										<div><p class="eyebrow">Full</p><p class="font-mono text-sm tabular-nums">{preview.full}</p></div>
										<div><p class="eyebrow">Short</p><p class="font-mono text-sm tabular-nums">{preview.short}</p></div>
										<div><p class="eyebrow">Range</p><p class="font-mono text-sm tabular-nums">{percent(preview.range_score)}</p></div>
									</div>
								</Card.Content>
							</Card.Root>
						</section>
					{/if}

					<div class="min-w-0 space-y-3">
						<h3 class="eyebrow">Lanes</h3>
						<ul aria-label="Live roster" class="grid gap-2">
							{#each session.participants as person (person.id)}
								<li class="min-w-0">
									<button type="button" aria-pressed={person.id === preview?.id} onclick={() => (previewId = person.id)} class={['border-border bg-card hover:bg-muted/50 focus-visible:ring-ring/50 flex w-full min-w-0 items-center gap-3 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-[3px]', person.id === preview?.id && 'bg-accent/40 ring-2 ring-primary/40']}>
										<span class="bg-muted grid size-9 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold tabular-nums" aria-hidden="true">{person.lane}</span>
										<span class="flex min-w-0 flex-1 flex-col gap-2">
											<span class="flex flex-wrap items-center gap-2"><span class="font-mono text-sm font-semibold">{person.id}</span><Badge variant={rangeCue(person).variant} class="text-[10px]">{rangeCue(person).label}</Badge></span>
											<Progress value={person.reps} max={Math.max(person.target, 1)} aria-label={`${person.id} rep progress`} class="h-1.5" />
										</span>
										<span class="shrink-0 text-right font-mono text-xl font-semibold tabular-nums">{person.reps}<span class="text-muted-foreground text-xs font-normal"> / {person.target}</span></span>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				</div>

				<Dialog.Footer class="border-border/70 gap-3 border-t pt-4 sm:justify-between">
					<div class="text-muted-foreground flex items-center gap-1.5 text-xs">
						<span>Closing keeps the session running.</span>
						<Tooltip.Root><Tooltip.Trigger aria-label="About closing the monitor" class="focus-visible:ring-ring/50 inline-flex rounded-full outline-none focus-visible:ring-[3px]"><HugeiconsIcon icon={InformationCircleIcon} size={14} strokeWidth={2} /></Tooltip.Trigger><Tooltip.Content>Counts continue until you end and save the session.</Tooltip.Content></Tooltip.Root>
					</div>
					<div class="flex flex-wrap justify-end gap-2">
						<Button variant="outline" size="lg" onclick={() => (open = false)}>Close monitor</Button>
						<Button size="lg" disabled={busy} onclick={onEnd}>{busy ? 'Saving…' : 'End & save session'}</Button>
					</div>
				</Dialog.Footer>
			{:else}
				<Dialog.Header class="gap-1"><Dialog.Title class="text-xl">Live session</Dialog.Title><Dialog.Description>No session is running.</Dialog.Description></Dialog.Header>
				<Empty.Root class="min-h-36"><Empty.Header><Empty.Media variant="icon"><HugeiconsIcon icon={Camera01Icon} size={20} strokeWidth={2} /></Empty.Media><Empty.Title>No live session</Empty.Title><Empty.Description>Start a session to see live feedback.</Empty.Description></Empty.Header></Empty.Root>
				<Dialog.Footer><Button variant="outline" size="lg" onclick={() => (open = false)}>Close monitor</Button></Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
</Tooltip.Provider>
