<script lang="ts">
	import { cn } from '#lib/utils.js';

	type BrandSize = 'sm' | 'md' | 'lg';

	let {
		compact = false,
		size,
		class: className = '',
		href = '/'
	}: { compact?: boolean; size?: BrandSize; class?: string; href?: string } = $props();

	// `compact` is kept for backward compatibility and maps to the `sm` lockup.
	const resolvedSize = $derived<BrandSize>(size ?? (compact ? 'sm' : 'md'));
</script>

<!--
	Lockup alignment: the "Alder" cap-top sits on the tile's top edge and the
	REHABILITATION baseline sits on its bottom edge. Each size is a fixed set of
	tokens (tile, wordmark size, tagline size) where
	  tile = cap(wordmark) + gap + cap(tagline)
	so the alignment holds at every size. Lines are trimmed to cap-height /
	baseline with `text-box`, with a metric-based fallback for Atkinson Hyperlegible.
-->
<a
	{href}
	class={cn('brand group text-primary', className)}
	data-size={resolvedSize}
	aria-label="Alder Rehabilitation"
>
	<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
		<rect width="40" height="40" rx="10" class="brand-tile" />
		<path
			class="brand-glyph"
			fill-rule="evenodd"
			d="M8.7 31 17 9h6l8.3 22h-4.7l-1.735-4.6h-9.73L13.4 31Zm7.869-8.4h6.862L20 13.5Z"
		/>
	</svg>
	<span class="brand-words" aria-hidden="true">
		<span class="brand-name">Alder</span>
		<span class="brand-tagline">Rehabilitation</span>
	</span>
</a>

<style>
	.brand {
		/* md (default) */
		--brand-tile: 2.5rem; /* 40px */
		--brand-name: 2.125rem; /* 34px → cap ≈ 22.8px */
		--brand-tagline: 0.625rem; /* 10px → cap ≈ 6.7px */
		--brand-space: 0.75rem;

		display: inline-flex;
		align-items: center;
		gap: var(--brand-space);
		flex-shrink: 0;
		border-radius: calc(var(--radius) * 0.8);
		outline: none;
		white-space: nowrap;
		-webkit-tap-highlight-color: transparent;
	}

	.brand[data-size='sm'] {
		--brand-tile: 2rem; /* 32px */
		--brand-name: 1.6875rem; /* 27px → cap ≈ 18.1px */
		--brand-tagline: 0.5625rem; /* 9px → cap ≈ 6px */
		--brand-space: 0.625rem;
	}

	.brand[data-size='lg'] {
		--brand-tile: 3.5rem; /* 56px */
		--brand-name: 3rem; /* 48px → cap ≈ 32.2px */
		--brand-tagline: 0.875rem; /* 14px → cap ≈ 9.4px */
		--brand-space: 1rem;
	}

	.brand:focus-visible {
		box-shadow:
			0 0 0 3px var(--background),
			0 0 0 5px color-mix(in oklab, var(--ring) 70%, transparent);
	}

	.brand-mark {
		display: block;
		flex-shrink: 0;
		width: var(--brand-tile);
		height: var(--brand-tile);
	}

	.brand-tile {
		fill: var(--primary);
		transition: fill 150ms ease;
	}

	.brand-glyph {
		fill: var(--primary-foreground);
	}

	.brand:hover .brand-tile {
		fill: color-mix(in oklab, var(--primary) 88%, var(--foreground));
	}

	.brand-words {
		display: flex;
		flex-direction: column;
		/* the two cap-trimmed lines fill the tile exactly; the remainder is the gap */
		justify-content: space-between;
		height: var(--brand-tile);
	}

	.brand-name,
	.brand-tagline {
		display: block;
		font-family: var(--font-display);
		font-weight: 700;
		line-height: 1;
	}

	.brand-name {
		font-size: var(--brand-name);
		letter-spacing: -0.03em;
		/* Atkinson Hyperlegible: ascent 0.95, descent 0.29, cap 0.67 */
		margin-block: -0.16em -0.17em;
	}

	.brand-tagline {
		font-size: var(--brand-tagline);
		letter-spacing: 0.13em;
		margin-inline-end: -0.13em;
		margin-block: -0.16em -0.17em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--primary) 78%, var(--background));
	}

	@supports (text-box: trim-both cap alphabetic) {
		.brand-name,
		.brand-tagline {
			margin-block: 0;
			text-box: trim-both cap alphabetic;
		}
	}
</style>
