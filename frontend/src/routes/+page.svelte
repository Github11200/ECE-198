<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowRight01Icon,
		CheckmarkCircle02Icon,
		UserCircleIcon,
		UserMultipleIcon
	} from '@hugeicons/core-free-icons';
	import Brand from '#lib/components/brand.svelte';
	import ThemeToggle from '#lib/components/theme-toggle.svelte';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#lib/components/ui/card/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	const roles = [
		{
			href: '/patient/',
			title: 'Patient',
			description: 'See your exercise plan, saved sessions and the review notes from your instructor.',
			points: ['Session history for your ID', 'Rep and range results', 'Instructor review notes'],
			icon: UserCircleIcon,
			cta: 'Open patient view'
		},
		{
			href: '/admin/',
			title: 'Admin',
			description: 'Set up group sessions, assign participants to camera lanes and review saved results.',
			points: ['Participant roster and targets', 'Live session monitor', 'Session history and reports'],
			icon: UserMultipleIcon,
			cta: 'Open admin dashboard'
		}
	];
</script>

<svelte:head>
	<title>Choose a role · Alder Rehabilitation</title>
	<meta
		name="description"
		content="CCCARE exercise tracker for Alder Rehabilitation. Choose patient or admin to continue."
	/>
</svelte:head>

<div class="bg-background flex min-h-svh flex-col">
	<header class="page-container flex h-16 items-center justify-between gap-4">
		<Brand compact />
		<div class="flex items-center gap-1">
			<Button variant="ghost" size="sm" href="/rehabilitation-programme/" class="text-muted-foreground hover:text-foreground">
				Programme overview
			</Button>
			<ThemeToggle />
		</div>
	</header>

	<main id="main" class="flex flex-1 flex-col justify-center py-10 sm:py-16">
		<div class="page-container flex flex-col gap-10">
			<div class="mx-auto max-w-2xl text-center">
				<p class="eyebrow">CCCARE EXERCISE TRACKER</p>
				<h1 class="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
					Who is using the tracker today?
				</h1>
				<p class="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
					Choose your role to open your dashboard.
				</p>
			</div>

			<div class="mx-auto grid w-full max-w-4xl gap-5 md:grid-cols-2">
				{#each roles as role (role.href)}
					<a
						href={role.href}
						class="group focus-visible:ring-ring/50 focus-visible:ring-offset-background block rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2"
						aria-label={`${role.title}: ${role.cta}`}
					>
						<Card class="h-full gap-6 p-0 py-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
							<CardHeader class="gap-4 px-6 pt-6 sm:px-7 sm:pt-7">
								<span class="bg-accent text-accent-foreground grid size-12 place-items-center rounded-xl">
									<HugeiconsIcon icon={role.icon} size={24} strokeWidth={1.8} />
								</span>
								<div class="flex flex-col gap-1.5">
									<CardTitle class="text-xl">{role.title}</CardTitle>
									<CardDescription class="text-sm leading-relaxed">{role.description}</CardDescription>
								</div>
							</CardHeader>

							<CardContent class="flex flex-1 flex-col gap-6 px-6 pb-6 sm:px-7 sm:pb-7">
								<ul class="flex flex-col gap-2.5 border-t pt-5">
									{#each role.points as point (point)}
										<li class="text-foreground flex items-center gap-2.5 text-sm">
											<HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} class="text-primary shrink-0" />
											{point}
										</li>
									{/each}
								</ul>
								<span class="text-primary mt-auto flex items-center justify-between gap-2 text-sm font-semibold">
									{role.cta}
									<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} class="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
								</span>
							</CardContent>
						</Card>
					</a>
				{/each}
			</div>

		</div>
	</main>
</div>
