# The standard of Minder
What the front holds to from now on: its direction, its tokens and its kit, each where it lives in the code, and its own rules.

## Direction
toile: the big kitchen table under its oilcloth, where the family sits on Sunday and shares out the memories. Drawn from the world of a family emptying a sold house, it serves the main loop the product sheet gives: Muriel sets the objects on the table one by one, each relative says « je le veux » or « non merci » with a thumb, and the recap shows who wants what around the table. Cobalt faience and enamel white, a bold vichy kept to bands and table surfaces, round enamel-like tokens for the two answers, one citron for what needs a look. Chosen in an autonomous AEOM round (toile, pastilles, classique): toile won its duel and the final 3–0; from pastilles it keeps one colour per relative in the recap.

## Tokens

### Colours
- `--color-cobalt: #2343a6` in `src/app/globals.css`, under `@theme`: the house colour, top bars, main actions
- `--color-cobalt-deep: #172d73` in `src/app/globals.css`, under `@theme`
- `--color-ink: #121a3a` in `src/app/globals.css`, under `@theme`
- `--color-enamel: #fdfcf8` in `src/app/globals.css`, under `@theme`
- `--color-faience: #eef1f8` in `src/app/globals.css`, under `@theme`
- `--color-line: #d5dbeb` in `src/app/globals.css`, under `@theme`
- `--color-muted: #4c5577` in `src/app/globals.css`, under `@theme`
- `--color-citron: #ffd84a` in `src/app/globals.css`, under `@theme`: what needs a look (auto badge, to discuss, focus ring)
- `--color-bottle: #17704a` in `src/app/globals.css`, under `@theme`: « je le veux »
- `--color-bottle-soft: #dcefe4` in `src/app/globals.css`, under `@theme`
- `--color-alert: #b3261e` in `src/app/globals.css`, under `@theme`
- `--color-alert-soft: #fbe4e2` in `src/app/globals.css`, under `@theme`
- `--vichy: rgba(35, 67, 166, 0.5)` in `src/app/globals.css`

### Type
- `--font-display: var(--font-bricolage), system-ui, sans-serif` in `src/app/globals.css`, under `@theme`
- `--font-sans: var(--font-figtree), system-ui, sans-serif` in `src/app/globals.css`, under `@theme`

### Shape and motion
- `--radius-card: 22px` in `src/app/globals.css`, under `@theme`
- `--radius-sheet: 28px` in `src/app/globals.css`, under `@theme`
- `--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1)` in `src/app/globals.css`, under `@theme`

## Components

### Classes (Tailwind `@utility`)
- `toile` in `src/app/globals.css`: the oilcloth surface
- `toile-band` in `src/app/globals.css`: the vichy hem under a top bar
- `btn` in `src/app/globals.css`: the one button, with its variants btn-ghost, btn-citron, btn-light, btn-quiet, btn-danger and btn-sm
- `field` in `src/app/globals.css`
- `chip` in `src/app/globals.css`
- `kicker` in `src/app/globals.css`
- `plate` in `src/app/globals.css`: a relative's seat
- `token` in `src/app/globals.css`: the two big answer buttons, token-yes and token-no
- `swipe-card` in `src/app/globals.css`

### React
- `ListShell` in `src/components/ui.tsx`: top bar, tabs on desktop, bottom tabs on phone
- `SiteHeader` in `src/components/site-header.tsx`
- `Brand` in `src/components/ui.tsx`
- `Notice` in `src/components/ui.tsx`
- `Photo` in `src/components/ui.tsx`
- `Seat` in `src/components/ui.tsx`
- `SectionHead` in `src/components/ui.tsx`
- `Mug` in `src/components/ui.tsx`: the empty states' coffee mug
- `Loading` in `src/components/ui.tsx`
- `src/components/icons.tsx`: the stroke icons
- `src/components/art.tsx`: the flat drawings of objects

## Rules
- Phone first: every screen is designed at 390 px, then laid out at 1280 px; nothing scrolls sideways and taps are 44 px at least.
- Green bottle is only « je le veux »; « non merci » is ink on enamel; never red for a no.
- Citron marks only what needs a look: the « auto » badge, objects « à discuter », the focus ring, the recap link.
- The vichy stays on surfaces and bands (hero, table, upload head, top-bar hem), never behind running text.
- Each relative keeps one seat colour, from their id, wherever they appear.
- Component classes are Tailwind `@utility` blocks and base rules sit in `@layer base`, so utilities and variants always win.
- Copy is French, warm and a little funny, never memes; no sentence about the interface itself.
- Motion only on transform and opacity, and none under prefers-reduced-motion.
