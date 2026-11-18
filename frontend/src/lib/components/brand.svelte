<script lang="ts">
	import { cn } from '#lib/utils.js';

	type BrandSize = 'sm' | 'md' | 'lg';

	let {
		compact = false,
		size,
		class: className = '',
		href = '/'
	}: { compact?: boolean; size?: BrandSize; class?: string; href?: string } = $props();

	// `compact` is kept for backward compatibility and maps to `sm`.
	const resolvedSize = $derived<BrandSize>(size ?? (compact ? 'sm' : 'md'));
	const uid = $props.id();
</script>

<!-- The Alder mark on its own: a glossy tile with the "A" glyph. No wordmark. -->
<a
	{href}
	class={cn('brand group', className)}
	data-size={resolvedSize}
	aria-label="Alder Rehabilitation, home"
	title="Alder Rehabilitation"
>
	<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
		<defs>
			<linearGradient id="{uid}-tile" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" style="stop-color: color-mix(in oklab, var(--primary) 70%, white)" />
				<stop offset="0.55" style="stop-color: var(--primary)" />
				<stop offset="1" style="stop-color: color-mix(in oklab, var(--primary) 80%, black)" />
			</linearGradient>
			<linearGradient id="{uid}-gloss" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="#fff" stop-opacity="0.5" />
				<stop offset="1" stop-color="#fff" stop-opacity="0" />
			</linearGradient>
		</defs>
		<rect width="40" height="40" rx="11" fill="url(#{uid}-tile)" />
		<path d="M11 1.5h18a9.5 9.5 0 0 1 9.5 9.5v6c-6 2.4-12 3.4-18.5 3.4S7.5 19.4 1.5 17v-6A9.5 9.5 0 0 1 11 1.5Z" fill="url(#{uid}-gloss)" />
		<rect x="0.5" y="0.5" width="39" height="39" rx="10.5" fill="none" stroke="rgb(0 0 0 / 0.18)" />
		<path
			class="brand-glyph"
			fill-rule="evenodd"
			d="M8.7 31 17 9h6l8.3 22h-4.7l-1.735-4.6h-9.73L13.4 31Zm7.869-8.4h6.862L20 13.5Z"
		/>
	</svg>
</a>

<style>
	.brand {
		--brand-tile: 2.25rem;
		display: inline-flex;
		align-items: center;
		vertical-align: middle;
		line-height: 0;
		flex-shrink: 0;
		border-radius: 0.75rem;
		outline: none;
		-webkit-tap-highlight-color: transparent;
	}

	.brand[data-size='sm'] { --brand-tile: 2rem; }
	.brand[data-size='lg'] { --brand-tile: 3.5rem; }

	.brand:hover .brand-mark { filter: brightness(1.06); }

	.brand:focus-visible {
		box-shadow:
			0 0 0 3px var(--background),
			0 0 0 5px color-mix(in oklab, var(--ring) 70%, transparent);
	}

	.brand-mark {
		display: block;
		width: var(--brand-tile);
		height: var(--brand-tile);
		transition: filter 150ms ease;
	}

	.brand-glyph {
		fill: var(--primary-foreground);
	}
</style>
