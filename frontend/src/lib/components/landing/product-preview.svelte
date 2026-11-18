<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	const people = [
		{ id: 'P01', reps: 12, target: 12, angle: '158°', status: 'In range', variant: 'success' as const },
		{ id: 'P02', reps: 9, target: 12, angle: '152°', status: 'Short attempt', variant: 'warning' as const },
		{ id: 'P03', reps: 9, target: 12, angle: '160°', status: 'In range', variant: 'success' as const },
		{ id: 'P04', reps: 7, target: 10, angle: '156°', status: 'In range', variant: 'success' as const },
		{ id: 'P05', reps: 6, target: 10, angle: '—', status: 'Tracking', variant: 'info' as const }
	];
</script>

<div aria-hidden="true" inert class="absolute inset-0 flex overflow-hidden bg-card text-foreground">
	<aside class="hidden w-[15%] min-w-[116px] flex-col border-r border-border bg-muted/35 px-3 py-4 sm:flex">
		<p class="mb-7 text-[13px] font-semibold tracking-tight">Alder<span class="ml-1 text-primary">●</span></p>
		<div class="space-y-1 text-[10px]">
			<p class="rounded-md border border-border bg-card px-2 py-2 font-medium text-foreground shadow-[var(--shadow-xs)]">Live session</p>
			<p class="px-2 py-2 text-muted-foreground">Sessions</p>
			<p class="px-2 py-2 text-muted-foreground">Reports</p>
			<p class="px-2 py-2 text-muted-foreground">Participants</p>
		</div>
		<p class="mt-auto border-t border-border pt-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Local records</p>
	</aside>
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3 sm:h-14 sm:px-5">
			<div class="min-w-0">
				<p class="truncate text-[11px] font-semibold sm:text-sm">Seated knee extensions</p>
				<p class="hidden font-mono text-[9px] text-muted-foreground sm:block">5 camera lanes · target range ≥ 155°</p>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<Badge variant="success" class="h-5 px-2 text-[9px]"><span class="mr-1 size-1.5 rounded-full bg-current motion-safe:animate-pulse"></span>Live</Badge>
				<span class="hidden font-mono text-[10px] tabular-nums text-muted-foreground sm:inline">12:48</span>
				<span class="hidden rounded-full border border-border bg-card px-2.5 py-1 text-[10px] shadow-[var(--shadow-xs)] sm:inline">End session</span>
			</div>
		</div>
		<div class="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:grid sm:grid-cols-[minmax(0,1.55fr)_minmax(180px,1fr)] sm:gap-3 sm:p-4">
			<div class="dark relative isolate flex h-[45%] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground sm:h-full">
				<div class="absolute inset-0 opacity-30" style="background-image: linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px); background-size: 24px 24px;"></div>
				<div class="relative flex shrink-0 items-center justify-between px-2.5 pt-2 font-mono text-[8px] uppercase tracking-wider text-muted-foreground sm:px-4 sm:pt-3 sm:text-[9px]"><span class="truncate">Camera · lane view</span><span class="shrink-0 whitespace-nowrap">5 tracked</span></div>
				<div class="relative grid min-h-0 flex-1 grid-cols-5 gap-1 px-2 pb-1 sm:gap-2 sm:px-4">
					{#each people as person}
						<div class="relative flex min-w-0 flex-col items-center justify-end">
							<svg viewBox="0 0 52 88" class="h-[70%] max-h-36 w-full text-primary" fill="none" aria-hidden="true">
								<circle cx="26" cy="11" r="5" stroke="currentColor" stroke-width="2" />
								<path d="M26 17 L26 39 M26 22 L12 34 L13 48 M26 22 L40 34 L39 48 M26 39 L15 58 L10 77 M26 39 L37 58 L43 77" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" />
								<circle cx="26" cy="39" r="2" fill="currentColor" /><circle cx="37" cy="58" r="2" fill="currentColor" />
							</svg>
							<span class="absolute right-0 top-2 hidden rounded border border-border bg-card px-1 font-mono text-[8px] text-foreground sm:inline">{person.angle}</span>
							<span class="font-mono text-[8px] text-foreground sm:text-[10px]">{person.id}</span>
						</div>
					{/each}
				</div>
				<div class="relative hidden shrink-0 border-t border-border px-4 py-2 font-mono text-[9px] text-muted-foreground sm:block">Range target: right knee ≥ 155°</div>
			</div>
			<div class="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card sm:flex sm:flex-col">
				<div class="hidden items-center justify-between border-b border-border px-3 py-2 sm:flex"><span class="text-[11px] font-semibold">Participants</span><span class="font-mono text-[9px] text-muted-foreground">REPS / TARGET</span></div>
				<div class="grid h-full grid-rows-5 divide-y divide-border sm:min-h-0 sm:flex-1">
					{#each people as person}
						<div class="flex min-h-0 items-center gap-2 px-2 sm:px-3">
							<span class="w-7 shrink-0 font-mono text-[9px] font-semibold sm:w-8 sm:text-[10px]">{person.id}</span>
							<div class="min-w-0 flex-1"><Progress value={person.reps / person.target * 100} class="h-1 sm:h-1.5" /></div>
							<span class="w-8 shrink-0 text-right font-mono text-[9px] tabular-nums sm:w-10 sm:text-[11px]">{person.reps}/{person.target}</span>
							<Badge variant={person.variant} class="hidden h-5 min-w-19 justify-center px-1 text-[8px] lg:inline-flex">{person.status}</Badge>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
