# Alder design system

Calm, warm, tactile. The Littlebird palette (cream, ink, forest green) with a soft peach
and sage glow instead of patterns or illustrations, a Raycast-style floating navbar,
and one glossy 3D button language (heyclicky gloss, Stripe/Clerk depth). Light mode first;
dark mode is a warm near-black.

Showcase: `/design` (dev only). Tokens live in `frontend/src/routes/layout.css`.

---

## 1. What we took from the references

| Site | Observed | Decision for Alder |
| --- | --- | --- |
| Linear | `#08090a` canvas, Inter 64px/510 with -1.4px tracking, pill "Sign up" with 5-layer hairline shadow stack, wireframe isometric drawings, product UI as hero | Near-black dark theme, tight display tracking, layered hairline shadows, product UI as the hero graphic |
| Multica | White canvas, Inter, 40px/400 headline, black pill CTA + outline pill, the real app shown in a framed window | Product-frame hero (`AppFrame`), pill buttons, one-line leads |
| Littlebird | Cream canvas `#fffdf5`, serif display (Meraki), emerald `#00694e` segmented tabs, sky-gradient panels behind UI cards, dark ink band | Warm off-white, serif accent word in headlines, emerald primary, gradient panels behind product cards, `.dark` ink bands |
| Mastra | `#020202`, mono labels, pill buttons with a 1.5px gradient border (`linear-gradient(#fff→transparent)` on border-box), green data accents, rounded container panels | Mono eyebrows and numbers, gradient-border highlight on buttons, bright mint accent in dark mode |
| heyclicky | Glossy pill: 5-stop vertical gradient, 1px saturated dark border, gloss PNG on top half, `inset 0 -15px 2px -12px rgba(255,255,255,.25)` bottom bounce light, `0 10px 24px rgba(0,0,0,.12)` drop, white text-shadow, dot-grid canvas | The `hero` button variant is our version of this, in mint/emerald; dot grid backdrops |
| Raycast | Floating nav that is invisible over the hero and turns into a frosted, hairline-bordered bar on scroll; the page background runs under it | `.nav-shell` floating header on marketing and dashboards |

Screenshots: `scratchpad/refs/board-*.jpg` (see report).

---

## 2. Tokens

### Colour (Littlebird palette, defined on `:root` and `.dark`)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--background` | `#fbf7ee` warm cream | `#141311` warm near-black | page canvas |
| `--foreground` | `#1c1b19` | `#f3efe6` | text |
| `--card` / `--popover` | `#fffdf8` ivory | `#1b1a17` / `#201f1b` | raised surfaces, menus |
| `--muted` | `#f3eee3` | `#24221e` | wells, tracks, hover |
| `--muted-foreground` | `#6e6a62` warm grey | `#a39e93` | secondary text |
| `--ink` / `--ink-foreground` | `#1c1b19` / `#fbf7ee` | `#f3efe6` / `#1c1b19` | primary buttons (the ink pill) |
| `--primary` | `#1f7a5c` forest green | `#5dbb92` | accents, brand mark, focus, progress, live states |
| `--primary-foreground` | `#fbf7ee` | `#10231b` | text on primary |
| `--secondary` / `--accent` | `#edf0e6` / `#e8efe4` sage washes | `#22261f` / `#243028` | tinted surfaces, selection |
| `--border` / `--border-strong` / `--input` | `#e9e2d4` / `#dcd3c1` / `#ddd5c4` | white 8% / 14% / 12% | hairlines, outlines, inputs |
| `--destructive` / `--success` / `--warning` / `--info` / `--clay` | `#c2412d` / `#2f8f62` / `#c98a1b` / `#3b6ea5` / `#b8683a` | lighter | status |
| `--glow` / `--glow-2` | `#fce7c3` peach / `#e4eed8` sage | `#3a2e1c` / `#1e2a22` | background washes only |
| `--leaf-1..3` | `#2f7d5b` `#5fa27a` `#a9cba2` | darker greens | small tints in product mock-ups |
| `--chart-1..5` | green, light green, amber, clay, blue | lighter | charts |

Rules: ink for primary actions, green for accents and state, no other saturated colour.
Backgrounds are a peach/sage glow, never a pattern. A dark band inside a light page is
`class="dark"` on the section (tokens re-scope).

### Type

| Role | Family | Size / line / tracking / weight | Class |
| --- | --- | --- | --- |
| Display XL (hero) | Inter Variable | `clamp(2.75rem, 6vw, 4.75rem)` / 1.02 / -0.045em / 600 | `.text-display-xl` |
| Display (section) | Inter Variable | `clamp(2rem, 4vw, 3.25rem)` / 1.06 / -0.035em / 600 | `.text-display` |
| Title | Inter Variable | 1.25rem / 1.3 / -0.02em / 600 | `.text-title` |
| Lead | Inter Variable | 1.0625–1.1875rem / 1.55 / muted | `.text-lead` |
| Body | Inter Variable | 15px app, 16px marketing / 1.6 | default |
| Accent word | Instrument Serif italic | inherits size, -0.01em, weight 400 | `.font-serif-accent` |
| Eyebrow, labels, numbers | Geist Mono Variable | 11.5px / 0.08em / uppercase / 500 | `.eyebrow`, `font-mono` |
| Stats | Inter, tabular | 2–2.5rem / -0.03em / 600 | `.stat-value` |

The logo is the mark only: a glossy forest-green tile with the "A" glyph (`brand.svelte`), never a
wordmark beside it and no glow or drop shadow around it. Its accessible name is "Alder Rehabilitation". Use the serif accent for at most
one or two words per headline.

### Spacing, radius, layout

- 4px base. Card padding 20px (`sm` 16px). Section rhythm: `py-20 md:py-28`. Stack gaps 12/16/24/40.
- Container: `max-w-[75rem]` with `px-5 sm:px-6 lg:px-8` (`.page-container`, `<Container>`).
- Radius: `--radius: 0.625rem` (10px). Inputs and menu items 10px/8px, cards 16px (`rounded-2xl`),
  dialogs and app frames 20px, buttons, badges, tabs and toggles are pills (`rounded-full`).

### Elevation (CSS variables, switch in dark)

```css
--shadow-xs: 0 1px 2px oklch(0.2 0.02 165 / 0.06);
--shadow-sm: 0 1px 2px oklch(0.2 0.02 165 / 0.06), 0 1px 1px oklch(0.2 0.02 165 / 0.04);
--shadow-card: 0 0 0 1px oklch(0.2 0.02 165 / 0.02), 0 1px 2px oklch(0.2 0.02 165 / 0.05), 0 4px 12px -4px oklch(0.2 0.02 165 / 0.08);
--shadow-lg: 0 1px 2px oklch(0.2 0.02 165 / 0.06), 0 12px 32px -8px oklch(0.2 0.02 165 / 0.18);
--shadow-xl: 0 2px 4px oklch(0.2 0.02 165 / 0.06), 0 24px 64px -16px oklch(0.2 0.02 165 / 0.28);
--highlight: inset 0 1px 0 0 rgb(255 255 255 / 0.75);   /* dark: rgb(255 255 255 / 0.06) */
/* dark: drop shadows use rgb(0 0 0 / 0.4–0.6) */
```

---

## 3. Components

All buttons share: pill radius, `font-medium`, 1px border, `transition: transform 120ms, box-shadow 180ms, filter 180ms, background 180ms` with `--ease-out`, hover lifts `translateY(-1px)`, active presses `translateY(0.5px)` and swaps the drop shadow for an inset one. Focus: `0 0 0 3px var(--background), 0 0 0 5px color-mix(in oklab, var(--ring) 55%, transparent)` added to the stack.

Every solid button uses the same gel construction: a vertical 3-stop gradient of its colour,
a 1px darker border, a glossy `::before` on the top half (`inset: 1px 1px 50%`, white at
`--gloss` alpha fading to 0), `inset 0 -2px 3px -1px` bottom shade and a soft drop shadow.
Pressing dims the gloss and insets the shadow. Only the gradient colour and `--gloss` change.

| Variant | Colour | `--gloss` light / dark |
| --- | --- | --- |
| `default` (alias `hero`) | `--ink` (near-black pill; cream in dark mode) | .2 / .6 |
| `outline` | ivory `#fffefb` to `#f4efe4`, border `--border-strong` | .95 / .16 |
| `secondary` | `--secondary` sage | .75 / .14 |
| `destructive` | `--destructive` | .4 |
| `ghost` | flat: no border or shadow, hover `--muted` | none |
| `link` | text only | none |

Sizes: `xs` h-7, `sm` h-8, `default` h-9 px-4, `lg` h-11 px-5, `xl` h-12 px-6 text-[15px], `icon*` circles.

Do: pair one `default` with one `outline` (or `ghost` in the navbar). Use `ghost` in toolbars and tables.
Don't: stack two filled buttons, invent one-off button styles, or add icons to every button.

**Card** - `rounded-2xl`, `bg-card`, 1px `--border`, `--shadow-card` + `--highlight`; dark adds
`linear-gradient(180deg, rgb(255 255 255/.03), transparent 40%)`. Variants (new, optional):
`default`, `elevated` (`--shadow-lg`), `inset` (muted well, inset shadow, no drop), `feature`
(1px top gradient line `transparent → --glow → transparent` and a faint radial glow top-left).
Do: one level of nesting max; use `inset` for wells inside cards.

**Badge** - pill h-6, 1px tinted border, `--highlight`. Variants: `default` (solid primary gel),
`secondary`, `outline`, `success`, `warning`, `destructive`, `info`, `ghost`, `link`. Tints:
`bg: color-mix(var(--x) 12%, var(--card))`, `border: color-mix(var(--x) 28%, var(--border))`, text the colour at ~0.4 L (light) / 0.85 L (dark).

**Inputs / select trigger / textarea** - h-10, `rounded-[10px]`, `bg-card` (dark `white/3%`), border `--input`,
recessed `inset 0 1px 2px oklch(0.2 0.02 165/.05)`; hover border `--border-strong`;
focus border `--ring` + `0 0 0 3px color-mix(var(--ring) 20%, transparent)`.

**Tabs / toggle-group** - segmented control: track `bg-muted` pill with `inset 0 1px 2px rgb(0 0 0/.06)`,
p-1, h-10; active trigger is a raised pill (`bg-card`, `--shadow-sm` + `--highlight`, dark `bg-white/8`).
`line` variant: no track, 2px primary underline.

**Dialog / sheet / dropdown / select content / popover** - `bg-popover`, 1px border, `--shadow-xl`,
dialogs `rounded-[20px]`, menus `rounded-xl p-1` with `rounded-lg` items; overlay `bg-black/30 backdrop-blur-[2px]`
(dark `black/60`). Enter: 160ms fade + scale .97→1.

**Table** - header row `text-xs font-medium text-muted-foreground` on a faint muted band, rows 48px,
`border-border/70` dividers, hover `bg-muted/50`, numbers `tabular-nums`. Wrap in a Card with no padding.

**Progress** - track h-2 pill `bg-muted` + inset shadow; indicator primary gradient
(`--primary` → `--glow` mix) with `--highlight` and `0 0 12px color-mix(var(--primary) 40%, transparent)`.

**Alert** - card surface, 1px tinted border, icon in a 28px tinted rounded square; variants `default`, `destructive` (+ `success`, `warning`, `info`).

**Tooltip** - ink (`--foreground` bg, `--background` text), `rounded-lg`, text-xs, `--shadow-lg`.

**Skeleton** - muted with a 1.6s shimmer (`linear-gradient` sweep), static under reduced motion.

**Empty** - dashed `--border-strong`, `rounded-2xl`, dot-grid fill masked radially.

---

## 4. Layout primitives

- `Container` (`#lib/components/ui/container/index.js`): `size: 'narrow' | 'default' | 'wide'`, `as`.
- `Section` + `SectionHeader` (`#lib/components/ui/section/index.js`): `tone: 'default' | 'muted' | 'ink'` (ink = dark island), `size: 'sm' | 'default' | 'lg'`, `contained`; header takes `eyebrow`, `title`, `description`, `align`.
- `Textarea` (`#lib/components/ui/textarea/index.js`) is new and matches `Input`.

## 4b. Graphics (`$lib/components/graphics`)

All are `aria-hidden`, `pointer-events-none`, absolutely positioned; parent needs `relative isolate overflow-hidden`.

| Component | Props | Recipe |
| --- | --- | --- |
| `Glow` | `color: 'primary'\|'mint'\|'cyan'\|'clay'`, `size='40rem'`, `opacity=0.5` | `radial-gradient(closest-side, color-mix(var(--c) 55%, transparent), transparent)`, `filter: blur(40px)`; position with `class` |
| `MeshGradient` | `preset: 'hero'\|'soft'\|'aurora'` | 3–4 stacked radial gradients of `--glow`, `--glow-2`, `--primary` at 10–30% alpha over transparent |
| `Noise` | `opacity=0.06` | inline SVG `feTurbulence baseFrequency=.8 numOctaves=3 stitchTiles` as data URI, `mix-blend-mode: multiply` (dark: `soft-light`) |
| `Scenery` | `preset: 'hero'\|'section'\|'card'\|'dashboard'` | gradient washes only, no illustration: hero = peach `--glow` radial at the top plus a sage `--glow-2` accent; section = a faint sage wash; card = glow fading to sage for the CTA panel; dashboard = a 24rem peach wash at the top |
| `Backdrop` | `preset: 'hero'\|'section'\|'dashboard'` | thin wrapper that renders `Scenery` with the same preset |
| `AppFrame` | `title?`, `children`, `class` | product-window chrome: `rounded-[20px]`, 1px border, `--shadow-xl`, 40px toolbar with three 10px dots and a centred mono title; this is where the looping demo video goes |

Do: use one backdrop per section and keep the illustration to the hero and CTA. Don't: use grids or dot patterns, stock photos of people, or more than one illustrated scene per viewport.

---

## 5. Motion

- `frontend/src/lib/motion.ts` owns GSAP animations. `heroIntro` staggers the headline, lead, actions and product frame over about 0.9s with `power3.out`.
- `revealOnScroll` uses ScrollTrigger to fade headings and cards in once as they enter, with a 16px rise and a short stagger for items entering together. Content stays fully visible until its entrance starts.
- Live badges have a steady dot with a GSAP halo that expands and fades in and out. Loading skeletons sweep over 1.6s. The product frame keeps a static preview underneath the demo video as it fades in.
- The prerendered HTML shows all content. GSAP actions use `matchMedia()` to skip animation under `prefers-reduced-motion` and revert their effects when removed. Reduced-motion visitors see the still demo image.
- CSS handles hover, press, navbar and component state transitions. These use `--ease-out`, `--dur-press` (120ms), `--dur-hover` (180ms) and `--dur-ui` (240ms). The reduced-motion stylesheet shortens these transitions.

---

## 6. Copy tone

- Short and confident. Headline at most 8 words; lead one sentence (at most 20 words).
- Product name is "Alder". No course codes, school, team, "project" or programme labels, and no decorative badges or eyebrows: a badge must show real state.
- Verbs first on buttons: "Start a session", "View reports". Two words where possible.
- Numbers over adjectives: "Live reps in under 100 ms" beats "blazing fast".
- One idea per section. Delete any paragraph a screenshot already explains.

---

## 7. Page patterns

**Marketing** (top to bottom)
1. Nav (Raycast-style): `fixed` and floating (`pt-3`, `max-w-6xl`, `h-12`, `rounded-2xl` `.nav-shell`). Transparent with no border over the hero; after 12px of scroll it becomes frosted (`background` 72%, `blur(18px) saturate(1.5)`, 8% hairline, inner top highlight). Mark left, 3–4 links centred, `ghost sm` + `default sm` right. The hero starts at the top of the page under it (`pt-36`).
2. Hero: `Backdrop preset="hero"` (peach glow), `.text-display-xl` with one `.font-serif-accent` word, `.text-lead`, `default xl` + `outline xl`, then `AppFrame` with the demo video. No eyebrow or pill badge above the headline.
3. Proof strip: 3–4 mono stats in a row, hairline dividers.
4. Feature grid: 3 `Card variant="feature"`, each with a tiny product-UI illustration, title, one line.
5. Quiet sections get `Backdrop preset="section"` (sage wash) at most; section headings have no eyebrow labels.
6. Ink band: `<Section class="dark">` for the live camera + wearable story.
7. CTA band and a compact 4-column footer.

**Dashboards** (admin, patient)
- Same floating `.nav-shell` header as marketing; `Backdrop preset="dashboard"` (peach wash) behind the top of the page only.
- Header row: title (`text-2xl font-semibold tracking-tight`) + muted one-liner, actions right (`outline` + `default`).
- KPI row: 3–4 Cards `size="sm"`, mono label, `.stat-value`, one muted line. No decorative badges.
- Main: Cards holding tables or live panels; use `Tabs` (segmented) for view switching.
- Live states: `success` badge with a pulsing dot; range cues use `warning`/`destructive` badges.
