<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowUpRight01Icon, Menu01Icon } from '@hugeicons/core-free-icons';
	import Brand from './brand.svelte';
	import ThemeToggle from './theme-toggle.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';

	let open = $state(false);
	const links = [
		{ href: '/#workflow', label: 'How it works' },
		{ href: '/#exercises', label: 'Exercises' },
		{ href: '/#about', label: 'About' }
	];
</script>

<header
	class="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b backdrop-blur-lg"
>
	<div class="page-container flex h-18 items-center justify-between gap-6">
		<Brand />
		<nav class="hidden items-center gap-1 md:flex" aria-label="Main navigation">
			{#each links as link}
				<a
					href={link.href}
					class="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors"
					>{link.label}</a
				>
			{/each}
		</nav>
		<div class="hidden items-center gap-2 md:flex">
			<ThemeToggle />
			<Button variant="ghost" href="/login/admin/" class="text-sm">Admin panel</Button>
			<Button href="/login/participant/" class="shadow-sm">
				Participant login
				<HugeiconsIcon icon={ArrowUpRight01Icon} size={16} strokeWidth={2} data-icon="inline-end" />
			</Button>
		</div>
		<Sheet.Root bind:open>
			<Sheet.Trigger
				class="hover:bg-muted inline-flex size-10 items-center justify-center rounded-lg transition-colors md:hidden"
				aria-label="Open navigation"
			>
				<HugeiconsIcon icon={Menu01Icon} size={22} strokeWidth={1.8} />
			</Sheet.Trigger>
			<Sheet.Content side="right" class="w-[min(20rem,88vw)] p-0 text-sm">
				<Sheet.Header class="border-b px-5 py-5">
					<Sheet.Title class="text-base">Menu</Sheet.Title>
				</Sheet.Header>
				<nav class="flex flex-col gap-1 p-4" aria-label="Mobile navigation">
					{#each links as link}
						<a
							href={link.href}
							class="hover:bg-muted rounded-lg px-3 py-2.5 font-semibold"
							onclick={() => (open = false)}>{link.label}</a
						>
					{/each}
					<div class="my-3 border-t"></div>
					<Button variant="outline" href="/login/admin/" class="w-full justify-start">Admin panel</Button>
					<Button href="/login/participant/" class="mt-2 w-full justify-start">Participant login</Button>
				</nav>
			</Sheet.Content>
		</Sheet.Root>
	</div>
</header>
