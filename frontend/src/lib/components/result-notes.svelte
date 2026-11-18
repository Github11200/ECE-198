<script lang="ts">
	import type { ParticipantResult } from '#lib/tracker-api.js';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#lib/components/ui/table/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01Icon, Tick02Icon, Alert02Icon } from '@hugeicons/core-free-icons';

	let { person }: { person: ParticipantResult } = $props();
	let open = $state(false);
</script>

<div class="flex flex-col gap-3">
	{#if person.issues.length}
		<ul class="flex flex-col gap-1.5" aria-label="Measurement notes">
			{#each person.issues as issue (issue)}
				<li class="text-foreground flex items-start gap-2 text-sm">
					<HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={2} class="text-warning mt-0.5 shrink-0" />
					<span>{issue}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-foreground flex items-center gap-2 text-sm">
			<HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.2} class="text-success shrink-0" />
			Rep target and measured range criteria met.
		</p>
	{/if}

	<Collapsible.Root bind:open>
		<Collapsible.Trigger
			class="inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<HugeiconsIcon
				icon={ArrowRight01Icon}
				size={15}
				strokeWidth={2}
				class={`transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
			/>
			Per-rep angles ({person.rep_details.length})
		</Collapsible.Trigger>
		<Collapsible.Content>
			{#if person.rep_details.length}
				<div class="mt-2 overflow-x-auto rounded-xl border border-border bg-muted/50">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead class="w-20">Rep</TableHead>
								<TableHead class="text-right">Peak angle</TableHead>
								<TableHead class="text-right">Range</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each person.rep_details as rep (rep.number)}
								<TableRow>
									<TableCell class="font-mono tabular-nums">{rep.number}</TableCell>
									<TableCell class="text-right font-mono tabular-nums">{rep.peak_angle.toFixed(2)}°</TableCell>
									<TableCell class="text-right"><Badge variant={rep.reached_range ? 'success' : 'warning'}>{rep.reached_range ? 'Reached' : 'Short'}</Badge></TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</div>
			{:else}
				<p class="text-muted-foreground mt-2 text-sm">Per-rep angles were not recorded.</p>
			{/if}
		</Collapsible.Content>
	</Collapsible.Root>
</div>
