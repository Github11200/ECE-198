<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
	import { Button } from '#lib/components/ui/button/index.js';
</script>

<section
	id="about"
	class="page-container scroll-mt-20 py-12 sm:py-16"
	aria-labelledby="about-title"
>
	<div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
		<div class="max-w-2xl">
			<h2 id="about-title" class="text-2xl font-bold tracking-tight sm:text-3xl">
				About the prototype
			</h2>
			<p class="text-muted-foreground mt-3 text-base leading-relaxed">
				A Waterloo ECE 198 project for tracking exercise activity and range during supervised CCCARE
				sessions. Participants use numbered IDs assigned by the instructor.
			</p>
			<p class="text-muted-foreground mt-3 text-sm leading-relaxed">
				Read the
				<a
					href="/rehabilitation-programme/"
					class="text-primary font-semibold underline-offset-4 hover:underline">programme overview</a
				>
				or the
				<a
					href="/cancer-exercise-program/"
					class="text-primary font-semibold underline-offset-4 hover:underline"
					>cancer exercise programme</a
				> page for more background.
			</p>
		</div>
		<Button href="/admin/" variant="secondary" size="lg" class="self-start md:self-center">
			Go to session setup
			<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} data-icon="inline-end" />
		</Button>
	</div>
</section>
