# Alder design system

Calm, precise, tactile. Minimal like Linear and Multica, warm like Littlebird, with the
glossy buttons of heyclicky and the quiet 3D depth of Stripe and Clerk. Light mode first;
dark mode is a first-class near-black (Linear and Mastra), never a muddy green.

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

Screenshots: `scratchpad/refs/board-*.jpg` (see report).

---

## 2. Tokens

### Colour (oklch, defined on `:root` and `.dark`)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--background` | `0.985 0.003 106` warm white | `0.155 0.006 165` near-black | page canvas |
| `--foreground` | `0.205 0.012 165` | `0.95 0.005 160` | text |
| `--card` | `1 0 0` | `0.19 0.007 165` | raised surfaces |
| `--popover` | `1 0 0` | `0.205 0.008 165` | menus, dialogs |
| `--muted` | `0.962 0.004 106` | `0.225 0.007 165` | wells, tracks, hover |
| `--muted-foreground` | `0.52 0.012 165` | `0.68 0.01 160` | secondary text |
| `--primary` | `0.5 0.11 160` emerald pine | `0.78 0.15 155` mint | actions, brand |
| `--primary-foreground` | `0.99 0.01 160` | `0.2 0.04 160` | text on primary |
| `--secondary` | `0.955 0.014 160` | `0.25 0.012 165` | tinted surfaces |
| `--accent` | `0.95 0.035 160` mint wash | `0.27 0.035 160` | selection, highlights |
| `--border` | `0.915 0.004 106` | `1 0 0 / 9%` | hairlines |
| `--border-strong` | `0.86 0.005 106` | `1 0 0 / 15%` | outline buttons, inputs hover |
| `--input` | `0.88 0.005 106` | `1 0 0 / 13%` | input borders |
| `--ring` | `0.62 0.13 158` | `0.78 0.15 155` | focus |
| `--destructive` | `0.58 0.19 27` | `0.7 0.17 25` | |
| `--success` / `--warning` / `--clay` / `--info` | `0.6 0.13 155` / `0.76 0.14 75` / `0.64 0.11 45` / `0.6 0.12 245` | lighter (+0.1 L) | status |
| `--glow` / `--glow-2` | `0.86 0.17 150` lime-mint / `0.82 0.1 200` cyan | same, lower alpha in use | graphics only |
| `--chart-1..5` | primary, mint `0.75 0.14 155`, amber `0.78 0.13 80`, clay, blue `0.62 0.11 235` | lighter | charts |

Rules: one saturated colour per view (primary). Glows and gradients use `--glow`, `--glow-2`
at low alpha. Status colours appear as tinted badges, never as large fills.
A dark band inside a light page is just `class="dark"` on the section (tokens re-scope).

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

The Alder wordmark keeps Atkinson Hyperlegible (scoped on `.brand`) so its cap/baseline
lockup stays exact. Use the serif accent for at most one or two words per headline.

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

**primary (`default`)** - emerald gel
```css
background: linear-gradient(180deg, color-mix(in oklab, var(--primary) 80%, white) 0%, var(--primary) 52%, color-mix(in oklab, var(--primary) 88%, black) 100%);
border-color: color-mix(in oklab, var(--primary) 65%, black);
box-shadow: inset 0 1px 0 rgb(255 255 255 / .28), inset 0 -1px 0 rgb(0 0 0 / .12), 0 1px 2px rgb(0 0 0 / .14), 0 4px 12px -4px color-mix(in oklab, var(--primary) 65%, transparent);
text-shadow: 0 1px 0 rgb(0 0 0 / .14);
/* active */ box-shadow: inset 0 1px 3px rgb(0 0 0 / .28); filter: brightness(.97);
```
**hero** - heyclicky gloss in mint (marketing CTAs only, max one per view)
```css
color: oklch(0.24 0.06 160);
background: linear-gradient(180deg, oklch(0.97 0.05 155) 0%, oklch(0.91 0.11 155) 20%, oklch(0.82 0.16 152) 52%, oklch(0.84 0.15 165) 82%, oklch(0.9 0.11 170) 100%);
border: 1px solid oklch(0.45 0.1 160);
box-shadow: inset 0 -14px 2px -12px rgb(255 255 255 / .45), inset 0 1px 0 rgb(255 255 255 / .9), 0 1px 1px oklch(0.3 0.08 160 / .2), 0 10px 24px -6px oklch(0.55 0.15 155 / .45);
text-shadow: 0 1px 1px rgb(255 255 255 / .7);
/* ::before gloss on the top half */ inset: 1px 1px 52% 1px; border-radius: 999px 999px 40% 40% / 999px 999px 100% 100%; background: linear-gradient(180deg, rgb(255 255 255 / .8), rgb(255 255 255 / .12));
```
**outline** - Stripe/Clerk white key: `linear-gradient(180deg, #fff, oklch(0.975 0.003 106))`, border `--border-strong`, `inset 0 1px 0 #fff, 0 1px 2px oklch(0.2 0.02 165 / .08)`. Dark: `linear-gradient(180deg, rgb(255 255 255/.08), rgb(255 255 255/.03))`, border white/12, `inset 0 1px 0 rgb(255 255 255/.08), 0 1px 2px rgb(0 0 0/.5)`.
**secondary** - mint-tinted key: same construction as outline over `--secondary`, border `color-mix(in oklab, var(--primary) 18%, var(--border))`, text `--secondary-foreground`.
**ghost** - no border or shadow; hover `--muted`; active `inset 0 1px 2px rgb(0 0 0/.06)`.
**destructive** - primary recipe over `--destructive`.
**link** - unchanged.
Sizes: `xs` h-7, `sm` h-8, `default` h-9 px-4, `lg` h-11 px-5, `xl` h-12 px-6 text-[15px] (hero), `icon*` circles.

Do: pair `hero` (or `default`) with one `outline`. Use `ghost` in toolbars and tables.
Don't: stack two filled buttons, put `hero` inside dashboards, or add icons to every button.

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
| `GridPattern` | `variant: 'lines'\|'dots'`, `size=32`, `fade: 'radial'\|'top'\|'bottom'\|'none'` | lines: two 1px `linear-gradient`s of `color-mix(var(--foreground) 7%, transparent)`; dots: `radial-gradient(circle at 1px 1px, color-mix(var(--foreground) 14%, transparent) 1px, transparent 0)`; radial mask `radial-gradient(ellipse 70% 60% at 50% 0%, #000 30%, transparent 75%)` |
| `Glow` | `color: 'primary'\|'mint'\|'cyan'\|'clay'`, `size='40rem'`, `opacity=0.5` | `radial-gradient(closest-side, color-mix(var(--c) 55%, transparent), transparent)`, `filter: blur(40px)`; position with `class` |
| `MeshGradient` | `preset: 'hero'\|'soft'\|'aurora'` | 3–4 stacked radial gradients of `--glow`, `--glow-2`, `--primary` at 10–30% alpha over transparent |
| `Noise` | `opacity=0.06` | inline SVG `feTurbulence baseFrequency=.8 numOctaves=3 stitchTiles` as data URI, `mix-blend-mode: multiply` (dark: `soft-light`) |
| `Horizon` | `class` | a 200% wide ellipse with a 1px `--glow` top border and a soft glow beneath; sits behind the hero product frame (Linear/heyclicky arc) |
| `Backdrop` | `preset: 'hero'\|'section'\|'dashboard'` | composite: hero = mesh + dot grid (radial fade) + noise + horizon; section = line grid (top fade) + one glow; dashboard = a 320px top glow + faint grid only |
| `AppFrame` | `title?`, `children`, `class` | product-window chrome: `rounded-[20px]`, 1px border, `--shadow-xl`, 40px toolbar with three 10px dots and a centred mono title; this is where the looping demo video goes |

Do: use one backdrop per section, put product UI on top. Don't: use stock photos of people, more than two glows in one viewport, or noise above 0.08.

---

## 5. Motion

- Tokens: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`;
  `--dur-press: 120ms`, `--dur-hover: 180ms`, `--dur-ui: 240ms`, `--dur-reveal: 600ms`.
- Buttons: lift on hover, press on active (transform only). Cards with links: `-translate-y-0.5` + `--shadow-lg` on hover.
- `.reveal` (fade + 8px rise, `--dur-reveal`, `--ease-out`); stagger with `style="--reveal-delay: 80ms"`.
- Reduced motion: global rule zeros durations; graphics never animate under `prefers-reduced-motion`.

---

## 6. Copy tone

- Short and confident. Headline at most 8 words; lead one sentence (at most 20 words).
- Product name is "Alder" (lockup: Alder Rehabilitation). No course codes, school, team or "project" labels.
- Verbs first on buttons: "Start a session", "View reports". Two words where possible.
- Numbers over adjectives: "Live reps in under 100 ms" beats "blazing fast".
- One idea per section. Delete any paragraph a screenshot already explains.

---

## 7. Page patterns

**Marketing** (top to bottom)
1. Nav: sticky, `h-14`, `bg-background/70 backdrop-blur-md`, bottom hairline on scroll; brand left, 3–4 links, `outline sm` + `default sm` right.
2. Hero: `Backdrop preset="hero"`, eyebrow pill, `.text-display-xl` with one `.font-serif-accent` word, `.text-lead`, `hero xl` + `outline xl`, then `AppFrame` with the demo video, `Horizon` behind it.
3. Proof strip: 3–4 mono stats in a row, hairline dividers.
4. Feature grid: 3 `Card variant="feature"`, each with a tiny product-UI illustration, title, one line.
5. Alternating splits: text left, framed UI right on a `MeshGradient preset="soft"` panel (Littlebird sky-panel idea).
6. Ink band: `<Section class="dark">` for the live camera + wearable story.
7. CTA band and a compact 4-column footer.

**Dashboards** (admin, patient)
- `Backdrop preset="dashboard"` behind the top of the page only.
- Header row: title (`text-2xl font-semibold tracking-tight`) + muted one-liner, actions right (`outline` + `default`).
- KPI row: 3–4 Cards `size="sm"`, mono label, `.stat-value`, tiny delta badge.
- Main: Cards holding tables or live panels; use `Tabs` (segmented) for view switching.
- Live states: `success` badge with a pulsing dot; range cues use `warning`/`destructive` badges.
