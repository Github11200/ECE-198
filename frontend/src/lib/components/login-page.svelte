<script lang="ts">
	import { goto } from '$app/navigation';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		ArrowLeft01Icon,
		ArrowRight01Icon,
		CheckIcon
	} from '@hugeicons/core-free-icons';
	import Brand from './brand.svelte';
	import ThemeToggle from './theme-toggle.svelte';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader
	} from '#lib/components/ui/card/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';

	let { role }: { role: 'admin' | 'participant' } = $props();

	const admin = $derived(role === 'admin');
	const year = new Date().getFullYear();

	const features = $derived(
		admin
			? [
					'Participant records and lane assignments',
					'Individual rep targets for the group',
					'Group session history and workout reports'
				]
			: [
					'Your assigned exercise plan',
					'Your progress across sessions',
					'Your saved results and review notes'
				]
	);

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		// Demo navigation only: neither field is read, stored, or submitted.
		goto(admin ? '/admin/' : '/participant/');
	}
</script>

<main id="main" class="bg-background flex min-h-svh flex-col lg:grid lg:grid-cols-[1.02fr_1fr]">
	<aside
		class="bg-primary text-primary-foreground relative isolate flex flex-col justify-between gap-10 overflow-hidden p-6 sm:p-10 lg:min-h-svh lg:p-12 xl:p-16"
	>
		<div
			class="pointer-events-none absolute inset-0 opacity-[0.07]"
			style="background-image: radial-gradient(currentColor 1px, transparent 1px); background-size: 26px 26px;"
			aria-hidden="true"
		></div>
		<div
			class="bg-primary-foreground/15 pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full blur-3xl"
			aria-hidden="true"
		></div>
		<div
			class="bg-primary-foreground/10 pointer-events-none absolute -bottom-40 -left-20 size-[24rem] rounded-full blur-3xl"
			aria-hidden="true"
		></div>

		<div class="relative flex items-center justify-between gap-4">
			<Brand
				compact
				class="text-primary-foreground [&>span]:text-primary-foreground [&>span>span]:text-primary-foreground/70 [&_rect]:fill-primary-foreground/10 [&_rect]:stroke-primary-foreground/40"
			/>
			<a
				href="/"
				class="text-primary-foreground/75 hover:text-primary-foreground focus-visible:ring-primary-foreground/40 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
				aria-label="Back to the clinic"
			>
				<HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
				<span class="hidden sm:inline">Back to the clinic</span>
				<span class="sm:hidden">Back</span>
			</a>
		</div>

		<div class="relative max-w-md">
			<p class="text-primary-foreground/65 text-[0.72rem] font-bold tracking-[0.16em] uppercase">
				CCCARE EXERCISE TRACKER
			</p>
			<h1 class="mt-4 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
				{admin ? 'Instructor access' : 'Participant access'}
			</h1>
			<p class="text-primary-foreground/80 mt-4 text-base leading-relaxed">
				{admin
					? 'Set up the exercise, assign participants to camera lanes, and keep the whole session record in one place.'
					: 'Open your demonstration programme to see your exercise plan and the example records saved from previous sessions.'}
			</p>

			<ul class="mt-8 space-y-3.5">
				{#each features as feature}
					<li class="flex items-start gap-3">
						<span
							class="bg-primary-foreground/10 text-primary-foreground mt-0.5 grid size-6 shrink-0 place-items-center rounded-full"
						>
							<HugeiconsIcon icon={CheckIcon} size={13} strokeWidth={2.6} />
						</span>
						<span class="text-primary-foreground/85 text-sm leading-relaxed">{feature}</span>
					</li>
				{/each}
			</ul>
		</div>

		<div
			class="text-primary-foreground/55 relative border-t border-primary-foreground/15 pt-5 text-xs leading-relaxed"
		>
			<p>Alder Rehabilitation · CCCARE Exercise Tracker</p>
			<p class="mt-1">Waterloo ECE 198 classroom prototype</p>
		</div>
	</aside>

	<div class="bg-background flex flex-1 flex-col">
		<div class="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
			<Badge variant="outline" class="hidden sm:inline-flex">Classroom prototype</Badge>
			<div class="ml-auto">
				<ThemeToggle />
			</div>
		</div>

		<div class="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-12">
			<div class="w-full max-w-md">
				<section aria-labelledby="sign-in-title">
					<Card class="shadow-sm [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
						<CardHeader>
							<p class="eyebrow">{admin ? 'ADMIN LOGIN' : 'PARTICIPANT LOGIN'}</p>
							<h2 id="sign-in-title" class="mt-1 text-2xl font-bold tracking-tight">Sign in</h2>
							<CardDescription class="mt-1 text-sm leading-relaxed">
								{admin
									? 'Open your instructor workspace to set up and monitor a session.'
									: 'Open your personal programme and review your saved sessions.'}
							</CardDescription>
						</CardHeader>

						<CardContent>
							<form class="flex flex-col gap-5" onsubmit={handleSubmit} noValidate autocomplete="off">
								<div class="grid gap-2">
									<Label for="login-name">Name</Label>
									<Input
										id="login-name"
										name="name"
										type="text"
										placeholder="Enter your name"
										autocomplete="off"
										class="h-11"
									/>
								</div>

								<div class="grid gap-2">
									<Label for="login-password">Password</Label>
									<Input
										id="login-password"
										name="password"
										type="password"
										placeholder="Enter any password"
										autocomplete="off"
										aria-describedby="demo-login-help"
										class="h-11"
									/>
								</div>

								<p id="demo-login-help" class="text-muted-foreground text-xs leading-relaxed">
									Demo access. Any name and password will work.
								</p>

								<Button type="submit" size="lg" class="mt-1 w-full">
									Sign in
									<HugeiconsIcon
										icon={ArrowRight01Icon}
										size={16}
										strokeWidth={2}
										data-icon="inline-end"
									/>
								</Button>
							</form>
						</CardContent>
					</Card>
				</section>

				<p class="text-muted-foreground mt-6 text-center text-sm">
					{admin ? 'Looking for your exercise plan?' : 'Part of the care team?'}
					<a
						href={admin ? '/login/participant/' : '/login/admin/'}
						class="text-primary ml-1 inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline"
					>
						{admin ? 'Participant login' : 'Admin login'}
						<HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
					</a>
				</p>

				{#if !admin}
					<div class="mt-6 rounded-xl border border-dashed p-4">
						<Button
							variant="outline"
							class="w-full"
							disabled
							aria-describedby="create-account-help"
						>
							Create account
						</Button>
						<p id="create-account-help" class="text-muted-foreground mt-2.5 text-center text-xs">
							Account creation is not available in this demo.
						</p>
					</div>
				{/if}

				<p class="text-muted-foreground mt-8 text-center text-xs leading-relaxed">
					ECE 198 classroom demo · Fictional participant records
				</p>
			</div>
		</div>

		<footer class="border-t px-5 py-5 sm:px-8">
			<div
				class="text-muted-foreground mx-auto flex w-full max-w-md flex-col items-center justify-between gap-1.5 text-xs sm:flex-row"
			>
				<span>© {year} Alder Rehabilitation</span>
				<span>ECE 198 · University of Waterloo</span>
			</div>
		</footer>
	</div>
</main>
