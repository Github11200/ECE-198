<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Activity01Icon,
		ArmchairIcon,
		ArrowRight01Icon,
		ChartLineData01Icon,
		CheckIcon,
		ClipboardCheckIcon,
		Database02Icon,
		Dumbbell01Icon,
		FileValidationIcon,
		IdVerifiedIcon,
		Target01Icon,
		ViewOffSlashIcon
	} from '@hugeicons/core-free-icons';
	import SiteHeader from './site-header.svelte';
	import SiteFooter from './site-footer.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader } from '#lib/components/ui/card/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';

	const trust = [
		{ icon: Database02Icon, label: 'Local-first records' },
		{ icon: IdVerifiedIcon, label: 'Numbered participant IDs' },
		{ icon: ViewOffSlashIcon, label: 'No face recognition' }
	];

	const steps = [
		{
			title: 'Set up the group',
			copy: 'Choose the exercise, assign each participant’s numbered ID to a camera lane, and set a rep target for every person in the group.',
			icon: ClipboardCheckIcon
		},
		{
			title: 'Monitor the session',
			copy: 'Follow individual rep counts, range cues and tracking availability while participants exercise. Short attempts are visible as they happen.',
			icon: Activity01Icon
		},
		{
			title: 'Save and review',
			copy: 'End the session to save each participant’s results, then review short attempts, tracking notes and the workout report together.',
			icon: FileValidationIcon
		}
	];

	const exerciseGroups = [
		{
			title: 'Strength',
			copy: 'Seated right-arm curls, squats and pushups, each with a fixed standard.',
			icon: Dumbbell01Icon
		},
		{
			title: 'Chair-based movements',
			copy: 'Seated knee extensions, shoulder raises, marches and sit-to-stand.',
			icon: ArmchairIcon
		},
		{
			title: 'Saved results',
			copy: 'Reps completed, range target reached, tracking coverage and per-participant review notes.',
			icon: ChartLineData01Icon
		}
	];

	const aboutChecks = [
		'Supervised group sessions',
		'Individual rep targets',
		'Printable session reports'
	];
</script>

<div class="flex min-h-svh flex-col">
	<SiteHeader />

	<main id="main" class="flex-1">
		<!-- Hero -->
		<div class="relative isolate overflow-hidden">
			<div class="paper-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem]" aria-hidden="true"></div>
			<div
				class="bg-accent/50 pointer-events-none absolute -top-40 right-[-8rem] -z-10 size-[32rem] rounded-full blur-3xl"
				aria-hidden="true"
			></div>

			<section class="page-container py-14 sm:py-20 lg:py-28" aria-labelledby="hero-title">
				<div class="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
					<div class="max-w-xl">
						<p class="eyebrow">CCCARE EXERCISE PROGRAMME</p>
						<h1
							id="hero-title"
							class="mt-5 text-4xl leading-[1.04] font-bold tracking-[-0.035em] sm:text-5xl lg:text-[3.6rem]"
						>
							Supervised exercise, <span class="text-primary">measured with care.</span>
						</h1>
						<p class="text-muted-foreground mt-6 text-lg leading-relaxed">
							Set a rep target for every participant, follow range cues and tracking availability
							through the session, then close out with a record you can review together. One
							exercise, one group, one clear report.
						</p>

						<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
							<Button href="/admin/" size="lg">
								Open admin dashboard
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									size={16}
									strokeWidth={2}
									data-icon="inline-end"
								/>
							</Button>
							<Button href="/patient/" size="lg" variant="outline">Patient view</Button>
						</div>

						<ul class="mt-10 grid gap-3 border-t pt-6 sm:grid-cols-3 sm:gap-4">
							{#each trust as item}
								<li class="flex items-center gap-2.5">
									<HugeiconsIcon
										icon={item.icon}
										size={17}
										strokeWidth={1.8}
										class="text-primary shrink-0"
									/>
									<span class="text-foreground text-xs font-semibold">{item.label}</span>
								</li>
							{/each}
						</ul>
					</div>

					<div class="relative mx-auto w-full max-w-xl lg:max-w-none">
						<figure class="relative">
							<div
								class="border-primary/10 bg-accent/25 absolute -inset-3 -z-10 rounded-2xl border"
								aria-hidden="true"
							></div>
							<div class="bg-muted overflow-hidden rounded-2xl border shadow-sm">
								<img
									src="/images/rehabilitation-session.jpg"
									alt="A physiotherapist supporting a participant during a mat-based exercise"
									class="aspect-[4/3] w-full object-cover sm:aspect-[5/6]"
									width="1400"
									height="933"
									fetchpriority="high"
									decoding="async"
								/>
								<div class="relative">
									<Card
										class="bg-card/95 absolute inset-x-4 bottom-4 gap-3 px-4 [--card-spacing:--spacing(4)] shadow-lg backdrop-blur-sm sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-64"
									>
										<div class="flex items-center justify-between gap-3">
											<span
												class="text-primary inline-flex items-center gap-2 text-[0.68rem] font-bold tracking-[0.14em] uppercase"
											>
												<span class="relative flex size-2" aria-hidden="true">
													<span
														class="bg-primary motion-safe:animate-ping absolute inline-flex size-full rounded-full opacity-60"
													></span>
													<span class="bg-primary relative inline-flex size-2 rounded-full"></span>
												</span>
												Live session
											</span>
											<HugeiconsIcon
												icon={Activity01Icon}
												size={16}
												strokeWidth={1.8}
												class="text-muted-foreground shrink-0"
											/>
										</div>
										<div class="flex items-end justify-between gap-3">
											<div>
												<p class="num text-3xl leading-none font-bold">5</p>
												<p class="text-muted-foreground mt-1 text-xs font-medium">Camera lanes</p>
											</div>
											<div class="text-right">
												<p class="text-foreground text-xs font-semibold">Rep targets set</p>
												<p class="text-muted-foreground text-xs">All participants</p>
											</div>
										</div>
									</Card>
								</div>
							</div>
							<figcaption class="text-muted-foreground mt-3 text-xs">
								Supervised exercise · stock photograph
							</figcaption>
						</figure>
					</div>
				</div>
			</section>
		</div>

		<!-- Workflow -->
		<section
			id="workflow"
			class="page-container scroll-mt-24 border-t py-16 sm:py-24"
			aria-labelledby="workflow-title"
		>
			<div class="max-w-2xl">
				<p class="eyebrow">SESSION WORKFLOW</p>
				<h2 id="workflow-title" class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
					How a session works
				</h2>
				<p class="text-muted-foreground mt-4 text-base leading-relaxed sm:text-lg">
					One exercise and one group at a time — set up, observe, then save a record for every
					participant.
				</p>
			</div>

			<ol class="mt-10 grid gap-5 sm:mt-12 md:grid-cols-3">
				{#each steps as step, index}
					<li>
						<Card class="h-full">
							<CardHeader>
								<div class="flex items-start justify-between gap-4">
									<span class="num text-primary/45 text-4xl leading-none font-bold">
										{String(index + 1).padStart(2, '0')}
									</span>
									<span
										class="bg-accent text-accent-foreground grid size-10 shrink-0 place-items-center rounded-xl"
									>
										<HugeiconsIcon icon={step.icon} size={20} strokeWidth={1.8} />
									</span>
								</div>
								<h3 class="mt-2 text-lg font-bold tracking-tight">{step.title}</h3>
							</CardHeader>
							<CardContent>
								<p class="text-muted-foreground text-sm leading-relaxed">{step.copy}</p>
							</CardContent>
						</Card>
					</li>
				{/each}
			</ol>
		</section>

		<!-- Exercises -->
		<div class="bg-muted/30 border-y">
			<section
				id="exercises"
				class="page-container scroll-mt-24 py-16 sm:py-24"
				aria-labelledby="exercises-title"
			>
				<div class="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
					<div class="max-w-lg">
						<p class="eyebrow">EXERCISE LIBRARY</p>
						<h2 id="exercises-title" class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
							Movements with clear criteria
						</h2>
						<p class="text-muted-foreground mt-4 text-base leading-relaxed">
							Each exercise keeps a fixed standard for range and rep counting, so
							every participant is measured the same way each session.
						</p>
						<div class="mt-6 flex items-start gap-3 rounded-xl border bg-card p-4">
							<HugeiconsIcon
								icon={Target01Icon}
								size={18}
								strokeWidth={1.8}
								class="text-primary mt-0.5 shrink-0"
							/>
							<p class="text-muted-foreground text-sm leading-relaxed">
								Select the movement and review its fixed criteria in the admin dashboard.
							</p>
						</div>
						<Button href="/admin/" variant="outline" size="lg" class="mt-6">
							Open the admin dashboard
							<HugeiconsIcon
								icon={ArrowRight01Icon}
								size={16}
								strokeWidth={2}
								data-icon="inline-end"
							/>
						</Button>
					</div>

					<Card class="gap-0 py-0 shadow-sm">
						<div class="bg-muted/40 flex items-center justify-between gap-3 border-b px-5 py-4">
							<p class="text-foreground text-xs font-bold tracking-wider uppercase">
								Included in the programme
							</p>
							<Badge variant="secondary">3 groups</Badge>
						</div>
						<ul class="divide-y">
							{#each exerciseGroups as group}
								<li class="flex gap-4 px-5 py-5 sm:px-6 sm:py-6">
									<span
										class="bg-accent text-accent-foreground grid size-11 shrink-0 place-items-center rounded-xl"
									>
										<HugeiconsIcon icon={group.icon} size={21} strokeWidth={1.8} />
									</span>
									<div>
										<h3 class="text-base font-bold tracking-tight">{group.title}</h3>
										<p class="text-muted-foreground mt-1 text-sm leading-relaxed">{group.copy}</p>
									</div>
								</li>
							{/each}
						</ul>
					</Card>
				</div>
			</section>
		</div>

		<!-- About -->
		<section
			id="about"
			class="page-container scroll-mt-24 py-16 sm:py-24"
			aria-labelledby="about-title"
		>
			<div class="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
				<figure class="relative isolate order-1 mx-auto w-full max-w-md lg:order-none lg:mr-auto lg:ml-0">
					<div
						class="border-primary/10 bg-accent/25 absolute -inset-3 -z-10 rounded-2xl border"
						aria-hidden="true"
					></div>
					<div class="bg-muted overflow-hidden rounded-2xl border shadow-sm">
						<img
							src="/images/physiotherapy-care.jpg"
							alt="A clinician guiding a participant through an assisted leg stretch"
							class="aspect-[4/5] w-full object-cover"
							width="1200"
							height="1800"
							loading="lazy"
							decoding="async"
						/>
					</div>
					<figcaption class="text-muted-foreground mt-3 text-xs">
						One-to-one guidance · stock photograph
					</figcaption>
				</figure>

				<div class="max-w-xl">
					<p class="eyebrow">ABOUT</p>
					<h2 id="about-title" class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
						Built for supervised CCCARE sessions
					</h2>
					<p class="text-muted-foreground mt-4 text-base leading-relaxed">
						Alder Rehabilitation supports the CCCARE
						exercise programme. It supports instructor-led group sessions: participants receive
						numbered IDs at setup, their repetitions and range are followed by camera lane, and
						results stay attached to that number.
					</p>
					<p class="text-muted-foreground mt-4 text-base leading-relaxed">
						The tracker records what happened in the room — reps, range, tracking coverage and
						notes. It does not diagnose, score health, or identify anyone automatically.
					</p>

					<ul class="mt-7 space-y-3">
						{#each aboutChecks as item}
							<li class="flex items-start gap-3">
								<span
									class="bg-primary text-primary-foreground mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"
								>
									<HugeiconsIcon icon={CheckIcon} size={12} strokeWidth={3} />
								</span>
								<span class="text-foreground text-sm font-semibold">{item}</span>
							</li>
						{/each}
					</ul>

					<div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
						<Button href="/admin/" variant="secondary" size="lg">
							Go to session setup
							<HugeiconsIcon
								icon={ArrowRight01Icon}
								size={16}
								strokeWidth={2}
								data-icon="inline-end"
							/>
						</Button>
						<a
							href="/rehabilitation-programme/"
							class="text-primary inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold underline-offset-4 hover:underline"
						>
							Programme overview
							<HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
						</a>
					</div>
				</div>
			</div>
		</section>

		<!-- Final CTA -->
		<section class="page-container pb-16 sm:pb-24" aria-labelledby="cta-title">
			<Card
				class="bg-primary text-primary-foreground relative isolate gap-0 overflow-hidden border-0 py-0 shadow-none ring-0"
			>
				<div class="paper-grid pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden="true"></div>
				<div
					class="bg-primary-foreground/10 pointer-events-none absolute -top-24 right-[-4rem] size-80 rounded-full blur-3xl"
					aria-hidden="true"
				></div>
				<div
					class="relative flex flex-col gap-8 px-6 py-12 sm:px-10 sm:py-14 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-14"
				>
					<div class="max-w-2xl">
						<p class="text-primary-foreground/70 text-[0.72rem] font-bold tracking-[0.16em] uppercase">
							NEXT SESSION
						</p>
						<h2 id="cta-title" class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
							Ready for the next session?
						</h2>
						<p class="text-primary-foreground/80 mt-4 text-base leading-relaxed">
							Bring the group, set the targets, and leave with individual results you can review
							and print.
						</p>
					</div>
					<div class="flex shrink-0 flex-col gap-3 sm:flex-row">
						<Button href="/admin/" size="lg" variant="secondary">
							Open admin dashboard
							<HugeiconsIcon
								icon={ArrowRight01Icon}
								size={16}
								strokeWidth={2}
								data-icon="inline-end"
							/>
						</Button>
						<Button
							href="/patient/"
							size="lg"
							variant="outline"
							class="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
						>
							Patient view
						</Button>
					</div>
				</div>
			</Card>
		</section>
	</main>

	<SiteFooter />
</div>
