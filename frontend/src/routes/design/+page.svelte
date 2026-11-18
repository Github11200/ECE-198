<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Add01Icon,
		ArrowRight01Icon,
		CheckmarkCircle02Icon,
		Moon02Icon,
		PlayIcon,
		Sun03Icon
	} from '@hugeicons/core-free-icons';
	import { mode, toggleMode } from 'mode-watcher';
	import Brand from '#lib/components/brand.svelte';
	import { Container } from '#lib/components/ui/container/index.js';
	import { Section } from '#lib/components/ui/section/index.js';
	import { Button, type ButtonSize, type ButtonVariant } from '#lib/components/ui/button/index.js';
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge/index.js';
	import * as Card from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import * as Select from '#lib/components/ui/select/index.js';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Progress } from '#lib/components/ui/progress/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import * as Alert from '#lib/components/ui/alert/index.js';
	import * as Empty from '#lib/components/ui/empty/index.js';
	import * as Table from '#lib/components/ui/table/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import {
		AppFrame,
		Backdrop,
		Glow,
		GridPattern,
		Horizon,
		MeshGradient,
		Noise
	} from '#lib/components/graphics/index.js';

	let sideBySide = $state(false);
	const colours = [
		'background', 'card', 'muted', 'primary', 'secondary', 'accent', 'border',
		'border-strong', 'destructive', 'success', 'warning', 'info', 'clay', 'glow',
		'glow-2', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'
	];
	const buttonVariants: ButtonVariant[] = ['default', 'hero', 'secondary', 'outline', 'ghost', 'destructive', 'link'];
	const buttonSizes: ButtonSize[] = ['xs', 'sm', 'default', 'lg', 'xl'];
	const badgeVariants: BadgeVariant[] = ['default', 'secondary', 'outline', 'success', 'warning', 'destructive', 'info', 'ghost', 'link'];
	const cardVariants = ['default', 'elevated', 'inset', 'feature'] as const;
	const alertVariants = ['default', 'success', 'warning', 'destructive', 'info'] as const;
	const sessions = [
		{ participant: 'P01', exercise: 'Seated extension', reps: 12, target: 12, status: 'Complete', variant: 'success' },
		{ participant: 'P02', exercise: 'Shoulder raise', reps: 8, target: 10, status: 'In progress', variant: 'info' },
		{ participant: 'P03', exercise: 'Wrist rotation', reps: 10, target: 10, status: 'Complete', variant: 'success' },
		{ participant: 'P04', exercise: 'Seated extension', reps: 6, target: 12, status: 'Needs review', variant: 'warning' },
		{ participant: 'P05', exercise: 'Shoulder raise', reps: 0, target: 10, status: 'Queued', variant: 'secondary' }
	] as const;
</script>

<svelte:head>
	<title>Design system · Alder</title>
	<meta name="description" content="Alder's component and pattern showcase." />
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<header class="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
		<Container class="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2">
			<div class="flex min-w-0 items-center gap-3 sm:gap-5">
				<Brand size="sm" />
				<span class="hidden h-5 w-px bg-border sm:block"></span>
				<h1 class="text-sm font-semibold tracking-tight sm:text-base">Design system</h1>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="icon-sm" onclick={toggleMode} aria-label={`Switch to ${mode.current === 'dark' ? 'light' : 'dark'} mode`} title="Toggle colour mode">
					<HugeiconsIcon icon={mode.current === 'dark' ? Sun03Icon : Moon02Icon} size={17} strokeWidth={1.8} />
				</Button>
				<button class="flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring" role="switch" aria-checked={sideBySide} onclick={() => (sideBySide = !sideBySide)}>
					<span>Side by side</span>
					<span class="relative h-5 w-9 rounded-full border border-border-strong bg-muted transition-colors" class:bg-primary={sideBySide}>
						<span class="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-card shadow-sm transition-transform" class:translate-x-4={sideBySide}></span>
					</span>
				</button>
			</div>
		</Container>
	</header>

	<main id="main">
		{#if sideBySide}
			<div class="grid min-w-0 grid-cols-1 lg:grid-cols-2">
				<div class="design-light light min-w-0 bg-background text-foreground">
					<div class="sticky top-14 z-30 border-b border-border bg-background/90 px-5 py-2 font-mono text-xs uppercase tracking-wider backdrop-blur-md">Light</div>
					{@render showcase()}
				</div>
				<div class="dark min-w-0 bg-background text-foreground lg:border-l lg:border-border">
					<div class="sticky top-14 z-30 border-b border-border bg-background/90 px-5 py-2 font-mono text-xs uppercase tracking-wider backdrop-blur-md">Dark</div>
					{@render showcase()}
				</div>
			</div>
		{:else}
			{@render showcase()}
		{/if}
	</main>
</div>

{#snippet showcase()}
	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">01 / Foundation</p><h2 class="text-title">Colour</h2></div>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
			{#each colours as colour}
				<div class="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-xs)]">
					<div class="h-16 border-b border-border/70" style={`background-color: var(--${colour});`}></div>
					<div class="truncate px-3 py-2 font-mono text-[11px] text-muted-foreground">--{colour}</div>
				</div>
			{/each}
		</div>
	</Section>

	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">02 / Foundation</p><h2 class="text-title">Type</h2></div>
		<div class="grid gap-5 overflow-hidden">
			<div><p class="eyebrow mb-2">Display XL</p><p class="text-display-xl">Every rep, <em class="font-serif-accent">counted</em>.</p></div>
			<div><p class="eyebrow mb-2">Display</p><p class="text-display">See progress clearly.</p></div>
			<div><p class="eyebrow mb-2">Title</p><p class="text-title">Session overview</p></div>
			<div><p class="eyebrow mb-2">Lead</p><p class="text-lead">A clear view of each session, from first rep to final result.</p></div>
			<div><p class="eyebrow mb-2">Body</p><p>Track movement, count reps, and review progress.</p></div>
			<div class="flex flex-wrap items-center gap-4"><span class="eyebrow">Eyebrow / live session</span><span class="stat-value">12,480</span><kbd class="kbd">⌘ K</kbd></div>
		</div>
	</Section>

	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">03 / Actions</p><h2 class="text-title">Buttons</h2><p class="mt-1 text-sm text-muted-foreground">Hover and press to feel the depth.</p></div>
		<div class="space-y-5">
			{#each buttonVariants as variant}
				<div class="grid gap-2 border-b border-border/70 pb-4 last:border-0 sm:grid-cols-[7rem_1fr]">
					<p class="self-center font-mono text-xs text-muted-foreground">{variant}</p>
					<div class="flex flex-wrap items-center gap-2">
						{#each buttonSizes as size}
							<Button {variant} {size}>{size}</Button>
						{/each}
					</div>
				</div>
			{/each}
			<div class="flex flex-wrap items-center gap-3">
				<Button size="icon-xs" aria-label="Add"><HugeiconsIcon icon={Add01Icon} /></Button>
				<Button size="icon-sm" variant="secondary" aria-label="Play"><HugeiconsIcon icon={PlayIcon} /></Button>
				<Button size="icon" variant="outline" aria-label="Continue"><HugeiconsIcon icon={ArrowRight01Icon} /></Button>
				<Button size="icon-lg" variant="ghost" aria-label="Add"><HugeiconsIcon icon={Add01Icon} /></Button>
				<Button variant="default"><HugeiconsIcon icon={PlayIcon} /> Start session</Button>
				<Button variant="outline">View reports <HugeiconsIcon icon={ArrowRight01Icon} /></Button>
				<Button disabled>Disabled</Button>
				<Button href="#patterns" variant="link">Link button</Button>
			</div>
		</div>
	</Section>

	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">04 / Status</p><h2 class="text-title">Badges</h2></div>
		<div class="flex flex-wrap items-center gap-3">
			{#each badgeVariants as variant}<Badge {variant}>{variant}</Badge>{/each}
			<Badge variant="success"><span class="relative flex size-2"><span class="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60"></span><span class="relative inline-flex size-2 rounded-full bg-current"></span></span>Live</Badge>
		</div>
	</Section>

	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">05 / Surfaces</p><h2 class="text-title">Cards</h2></div>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each cardVariants as variant}
				<Card.Root {variant} size="sm"><Card.Header><Card.Title class="capitalize">{variant}</Card.Title><Card.Description>A surface for focused information.</Card.Description></Card.Header></Card.Root>
			{/each}
			<Card.Root size="sm"><Card.Content class="space-y-2"><p class="eyebrow">Completed reps</p><div class="flex flex-wrap items-end gap-3"><span class="stat-value">1,248</span><Badge variant="success">+12%</Badge></div><p class="text-xs text-muted-foreground">Across active sessions</p></Card.Content></Card.Root>
			<Card.Root><Card.Header><Card.Title>Session summary</Card.Title><Card.Description>Review movement and rep counts.</Card.Description><Card.Action><Button size="icon-sm" variant="ghost" aria-label="More options"><HugeiconsIcon icon={Add01Icon} /></Button></Card.Action></Card.Header><Card.Content><p class="text-sm">12 of 12 reps complete.</p></Card.Content><Card.Footer class="border-t border-border text-xs text-muted-foreground">Updated just now</Card.Footer></Card.Root>
		</div>
	</Section>

	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">06 / Input</p><h2 class="text-title">Forms</h2></div>
		<div class="grid max-w-3xl gap-5 sm:grid-cols-2">
			<Label class="grid gap-2 text-sm">Participant name<Input placeholder="Enter a name" /></Label>
			<Label class="grid gap-2 text-sm">Disabled input<Input placeholder="Unavailable" disabled /></Label>
			<Label class="grid gap-2 text-sm">Invalid input<Input aria-invalid="true" value="PXX" /></Label>
			<div class="grid gap-2"><Label>Participant</Label><Select.Root type="single" value="P01"><Select.Trigger class="w-full"><Select.Value placeholder="Choose participant" /></Select.Trigger><Select.Content>{#each ['P01', 'P02', 'P03', 'P04', 'P05'] as participant}<Select.Item value={participant} label={participant} />{/each}</Select.Content></Select.Root></div>
			<Label class="grid gap-2 text-sm sm:col-span-2">Session notes<Textarea placeholder="Add a short note" /></Label>
		</div>
	</Section>

	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">07 / Navigation</p><h2 class="text-title">Tabs &amp; toggles</h2></div>
		<div class="grid gap-6 xl:grid-cols-2">
			<div class="space-y-2"><p class="font-mono text-xs text-muted-foreground">Segmented</p><Tabs.Root value="overview"><Tabs.List><Tabs.Trigger value="overview">Overview</Tabs.Trigger><Tabs.Trigger value="activity">Activity</Tabs.Trigger><Tabs.Trigger value="results">Results</Tabs.Trigger></Tabs.List><Tabs.Content value="overview" class="text-sm text-muted-foreground">The current session at a glance.</Tabs.Content><Tabs.Content value="activity" class="text-sm text-muted-foreground">Recent movement activity.</Tabs.Content><Tabs.Content value="results" class="text-sm text-muted-foreground">Session results.</Tabs.Content></Tabs.Root></div>
			<div class="space-y-2"><p class="font-mono text-xs text-muted-foreground">Line</p><Tabs.Root value="today"><Tabs.List variant="line"><Tabs.Trigger value="today">Today</Tabs.Trigger><Tabs.Trigger value="week">This week</Tabs.Trigger><Tabs.Trigger value="month">This month</Tabs.Trigger></Tabs.List><Tabs.Content value="today" class="text-sm text-muted-foreground">Today's sessions.</Tabs.Content><Tabs.Content value="week" class="text-sm text-muted-foreground">This week's sessions.</Tabs.Content><Tabs.Content value="month" class="text-sm text-muted-foreground">This month's sessions.</Tabs.Content></Tabs.Root></div>
			<div class="space-y-2"><p class="font-mono text-xs text-muted-foreground">Toggle group</p><ToggleGroup.Root type="single" value="reps"><ToggleGroup.Item value="reps">Reps</ToggleGroup.Item><ToggleGroup.Item value="range">Range</ToggleGroup.Item><ToggleGroup.Item value="time">Time</ToggleGroup.Item></ToggleGroup.Root></div>
		</div>
	</Section>

	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">08 / Feedback</p><h2 class="text-title">States</h2></div>
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="space-y-5"><div class="space-y-3">{#each [25, 60, 100] as value}<div class="flex items-center gap-3"><Progress {value} /><span class="w-9 text-right font-mono text-xs">{value}%</span></div>{/each}</div><div class="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><Skeleton class="size-10 rounded-full" /><div class="flex-1 space-y-2"><Skeleton class="h-3 w-2/3" /><Skeleton class="h-3 w-1/2" /></div></div><Empty.Root class="min-h-44"><Empty.Header><Empty.Media variant="icon"><HugeiconsIcon icon={CheckmarkCircle02Icon} /></Empty.Media><Empty.Title>No sessions yet</Empty.Title><Empty.Description>Start a session to see progress here.</Empty.Description></Empty.Header><Empty.Content><Button size="sm">Start session</Button></Empty.Content></Empty.Root></div>
			<div class="space-y-3">{#each alertVariants as variant}<Alert.Root {variant}><Alert.Title class="capitalize">{variant === 'default' ? 'Heads up' : variant}</Alert.Title><Alert.Description>{variant === 'success' ? 'Session saved.' : variant === 'warning' ? 'Check the target range.' : variant === 'destructive' ? 'Tracker disconnected.' : variant === 'info' ? 'A new report is ready.' : 'The next session starts soon.'}</Alert.Description></Alert.Root>{/each}</div>
		</div>
	</Section>

	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">09 / Data</p><h2 class="text-title">Table</h2></div>
		<Card.Root class="p-0 gap-0"><Table.Root><Table.Header><Table.Row><Table.Head>Participant</Table.Head><Table.Head>Exercise</Table.Head><Table.Head>Reps</Table.Head><Table.Head>Target</Table.Head><Table.Head>Status</Table.Head></Table.Row></Table.Header><Table.Body>{#each sessions as session}<Table.Row><Table.Cell class="font-mono">{session.participant}</Table.Cell><Table.Cell>{session.exercise}</Table.Cell><Table.Cell>{session.reps}</Table.Cell><Table.Cell>{session.target}</Table.Cell><Table.Cell><Badge variant={session.variant}>{session.status}</Badge></Table.Cell></Table.Row>{/each}</Table.Body></Table.Root></Card.Root>
	</Section>

	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">10 / Interaction</p><h2 class="text-title">Overlays</h2></div>
		<div class="flex flex-wrap items-center gap-3">
			<Dialog.Root><Dialog.Trigger class="btn-3d btn-outline h-9 rounded-full px-4 text-sm font-medium">Open dialog</Dialog.Trigger><Dialog.Content><Dialog.Header><Dialog.Title>Session details</Dialog.Title><Dialog.Description>Review the live session before continuing.</Dialog.Description></Dialog.Header><Dialog.Footer><Dialog.Close class="btn-3d btn-outline h-9 rounded-full px-4 text-sm">Close</Dialog.Close></Dialog.Footer></Dialog.Content></Dialog.Root>
			<Sheet.Root><Sheet.Trigger class="btn-3d btn-outline h-9 rounded-full px-4 text-sm font-medium">Open sheet</Sheet.Trigger><Sheet.Content side="right"><Sheet.Header><Sheet.Title>Session queue</Sheet.Title><Sheet.Description>Five participants are ready.</Sheet.Description></Sheet.Header><div class="px-4 text-sm text-muted-foreground">Next: P02 · Shoulder raise</div></Sheet.Content></Sheet.Root>
			<DropdownMenu.Root><DropdownMenu.Trigger class="btn-3d btn-outline h-9 rounded-full px-4 text-sm font-medium">More actions</DropdownMenu.Trigger><DropdownMenu.Content><DropdownMenu.Label>Session</DropdownMenu.Label><DropdownMenu.Separator /><DropdownMenu.Item>View details</DropdownMenu.Item><DropdownMenu.Item>Export report</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>
			<Tooltip.Provider><Tooltip.Root><Tooltip.Trigger class="btn-3d btn-outline h-9 rounded-full px-4 text-sm font-medium">Hover for tip</Tooltip.Trigger><Tooltip.Content>Live counts update automatically.</Tooltip.Content></Tooltip.Root></Tooltip.Provider>
		</div>
	</Section>

	<Section size="sm" class="border-b border-border/70">
		<div class="mb-6"><p class="eyebrow">11 / Atmosphere</p><h2 class="text-title">Graphics</h2></div>
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			<div class="relative isolate h-56 overflow-hidden rounded-2xl border border-border bg-card"><GridPattern variant="lines" fade="none" /><span class="absolute bottom-4 left-4 font-mono text-xs">Grid / lines</span></div>
			<div class="relative isolate h-56 overflow-hidden rounded-2xl border border-border bg-card"><GridPattern variant="dots" fade="none" /><span class="absolute bottom-4 left-4 font-mono text-xs">Grid / dots</span></div>
			<div class="relative isolate h-56 overflow-hidden rounded-2xl border border-border bg-card"><Glow color="mint" size="18rem" /><span class="absolute bottom-4 left-4 font-mono text-xs">Glow / mint</span></div>
			{#each ['hero', 'soft', 'aurora'] as preset}<div class:dark={preset === 'aurora'} class="relative isolate h-56 overflow-hidden rounded-2xl border border-border bg-card text-foreground"><MeshGradient preset={preset as 'hero' | 'soft' | 'aurora'} /><span class="absolute bottom-4 left-4 font-mono text-xs">Mesh / {preset}</span></div>{/each}
			<div class="relative isolate h-56 overflow-hidden rounded-2xl border border-border bg-card"><Noise /><span class="absolute bottom-4 left-4 font-mono text-xs">Noise</span></div>
			<div class="relative isolate h-56 overflow-hidden rounded-2xl border border-border bg-card"><Horizon /><span class="absolute bottom-4 left-4 font-mono text-xs">Horizon</span></div>
			{#each ['hero', 'section', 'dashboard'] as preset}<div class="relative isolate h-56 overflow-hidden rounded-2xl border border-border bg-card"><Backdrop preset={preset as 'hero' | 'section' | 'dashboard'} /><span class="absolute bottom-4 left-4 font-mono text-xs">Backdrop / {preset}</span></div>{/each}
		</div>
		<div class="mt-6 max-w-2xl"><AppFrame title="alder.app/admin"><div class="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><Badge variant="success">Live</Badge><h3 class="mt-3 text-title">Seated extension</h3><p class="text-sm text-muted-foreground">P02 · Session 03</p></div><div class="text-left sm:text-right"><span class="stat-value">08 <span class="text-lg text-muted-foreground">/ 12</span></span><p class="eyebrow">Reps complete</p></div><Progress value={67} class="sm:col-span-2" /></div></AppFrame></div>
	</Section>

	<Section id="patterns" size="sm">
		<div class="mb-6"><p class="eyebrow">12 / Composition</p><h2 class="text-title">Pattern previews</h2></div>
		<div class="space-y-6">
			<div class="relative isolate overflow-hidden rounded-[20px] border border-border bg-background px-5 py-12 text-center sm:px-8 sm:py-16"><Backdrop preset="hero" /><div class="relative mx-auto max-w-2xl"><Badge variant="outline" class="mb-5">Movement, made clear</Badge><h3 class="text-display-xl">Every rep, <em class="font-serif-accent">counted</em>.</h3><p class="text-lead mx-auto mt-5 max-w-xl">Live tracking that turns movement into clear progress.</p><div class="mt-7 flex flex-wrap justify-center gap-3"><Button variant="hero" size="xl">Start a session <HugeiconsIcon icon={ArrowRight01Icon} /></Button><Button variant="outline" size="xl">View reports</Button></div><AppFrame title="alder.app/admin" class="mx-auto mt-10 max-w-xl text-left"><div class="grid gap-3 p-4 sm:grid-cols-3"><div class="rounded-xl bg-muted p-3"><p class="eyebrow">Live reps</p><p class="stat-value mt-2">12</p></div><div class="rounded-xl bg-muted p-3"><p class="eyebrow">Target</p><p class="stat-value mt-2">15</p></div><div class="rounded-xl bg-muted p-3"><p class="eyebrow">Progress</p><p class="stat-value mt-2">80%</p></div></div></AppFrame></div></div>
			<div class="relative isolate overflow-hidden rounded-[20px] border border-border bg-background p-5 sm:p-7"><Backdrop preset="dashboard" /><div class="relative"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="eyebrow">Dashboard</p><h3 class="mt-1 text-2xl font-semibold tracking-tight">Session overview</h3><p class="mt-1 text-sm text-muted-foreground">Your movement data, at a glance.</p></div><div class="flex flex-wrap gap-2"><Button variant="outline" size="sm">View reports</Button><Button size="sm">Start session</Button></div></div><div class="mt-6 grid gap-3 sm:grid-cols-3">{#each [{ label: 'Active sessions', value: '04', delta: '+1' }, { label: 'Completed reps', value: '248', delta: '+12%' }, { label: 'On target', value: '92%', delta: '+3%' }] as stat}<Card.Root size="sm"><Card.Content><p class="eyebrow">{stat.label}</p><div class="mt-2 flex flex-wrap items-end gap-2"><span class="stat-value">{stat.value}</span><Badge variant="success">{stat.delta}</Badge></div></Card.Content></Card.Root>{/each}</div></div></div>
		</div>
	</Section>
{/snippet}

<style>
	/* A local light scope keeps the left comparison accurate when html is dark. */
	.design-light {
		--background: oklch(0.985 0.003 106); --foreground: oklch(0.205 0.012 165);
		--card: oklch(1 0 0); --card-foreground: oklch(0.205 0.012 165);
		--popover: oklch(1 0 0); --popover-foreground: oklch(0.205 0.012 165);
		--muted: oklch(0.962 0.004 106); --muted-foreground: oklch(0.52 0.012 165);
		--primary: oklch(0.5 0.11 160); --primary-foreground: oklch(0.99 0.01 160);
		--secondary: oklch(0.955 0.014 160); --secondary-foreground: oklch(0.3 0.05 160);
		--accent: oklch(0.95 0.035 160); --accent-foreground: oklch(0.3 0.05 160);
		--border: oklch(0.915 0.004 106); --border-strong: oklch(0.86 0.005 106);
		--input: oklch(0.88 0.005 106); --ring: oklch(0.62 0.13 158);
		--destructive: oklch(0.58 0.19 27); --success: oklch(0.6 0.13 155);
		--warning: oklch(0.76 0.14 75); --clay: oklch(0.64 0.11 45);
		--info: oklch(0.6 0.12 245); --glow: oklch(0.86 0.17 150); --glow-2: oklch(0.82 0.1 200);
		--chart-1: oklch(0.5 0.11 160); --chart-2: oklch(0.75 0.14 155);
		--chart-3: oklch(0.78 0.13 80); --chart-4: oklch(0.64 0.11 45); --chart-5: oklch(0.62 0.11 235);
		--shadow-xs: 0 1px 2px oklch(.2 .02 165 / .06);
		--shadow-sm: 0 1px 2px oklch(.2 .02 165 / .06), 0 1px 1px oklch(.2 .02 165 / .04);
		--shadow-card: 0 0 0 1px oklch(.2 .02 165 / .02), 0 1px 2px oklch(.2 .02 165 / .05), 0 4px 12px -4px oklch(.2 .02 165 / .08);
		--shadow-lg: 0 1px 2px oklch(.2 .02 165 / .06), 0 12px 32px -8px oklch(.2 .02 165 / .18);
		--shadow-xl: 0 2px 4px oklch(.2 .02 165 / .06), 0 24px 64px -16px oklch(.2 .02 165 / .28);
		--highlight: inset 0 1px 0 rgb(255 255 255 / .75);
		color-scheme: light;
	}
	:global(.design-light .btn-outline) {
		background: linear-gradient(180deg, #fff, oklch(.975 .003 106));
		border-color: var(--border-strong);
		--btn-shadow: inset 0 1px 0 #fff, 0 1px 2px oklch(.2 .02 165 / .08);
	}
	:global(.design-light .btn-secondary) {
		background: linear-gradient(180deg, color-mix(in oklab, var(--secondary) 85%, white), var(--secondary));
	}
	:global(.design-light .surface-card), :global(.design-light .surface-elevated) {
		background-image: none;
	}
	:global(.design-light .field) { background: var(--card); }
	:global(.design-light .segmented-thumb[data-active]),
	:global(.design-light .segmented-thumb[data-state='on']),
	:global(.design-light .segmented-thumb[aria-pressed='true']) { background: var(--card); }
	:global(.design-light .badge-tint) {
		color: color-mix(in oklab, var(--badge-color) 70%, black);
	}
</style>
