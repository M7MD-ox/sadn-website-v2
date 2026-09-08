# SADN (سدن) — Design Tokens & Foundation

Source of truth: `src/app/globals.css` → `/* ── SADN Brand Layer ── */` (additive layer at end of file). All tokens are plain hex CSS vars, mapped into Tailwind v4 via `@theme inline` → utilities like `bg-sadn-plum-800`, `text-sadn-ink`, `bg-sadn-ivory`.

## 1. Color Tokens

| Token | Hex | Role |
| --- | --- | --- |
| `--sadn-plum-950` | `#2A1C28` | Ink-deep plum, near-black accents |
| `--sadn-plum-900` | `#3A2637` | Darkest plum surface / hover on primary |
| `--sadn-plum-800` | `#4B3249` | **PRIMARY BRAND** — buttons, active nav, selection |
| `--sadn-plum-700` | `#5C405A` | Pressed states, strong accents |
| `--sadn-plum-600` | `#6E4F6B` | Secondary accents, icons |
| `--sadn-plum-400` | `#A388A0` | Rings, focus, subtle accents |
| `--sadn-plum-200` | `#D5C7D2` | Hairlines, scrollbar thumb, dividers |
| `--sadn-plum-100` | `#EDE6EB` | Borders on white, nav hairline |
| `--sadn-plum-50` | `#F7F4F6` | Tinted chip/badge bg (`--accent`) |
| `--sadn-ivory` | `#FAF8F6` | Warm secondary surface (sections, cards) |
| `--sadn-stone` | `#F1EDE9` | Deeper warm neutral (image placeholders) |
| `--sadn-ink` | `#1C1719` | Primary text (`--foreground`) |
| `--sadn-ink-soft` | `#6B6266` | Secondary text (`--muted-foreground`) |

shadcn rewiring (additive override, cascade-ordered): `--primary`→plum-800, `--primary-foreground`→#FFF, `--ring`→plum-400, `--accent`→plum-50, `--accent-foreground`→plum-800, `--background`→#FFFFFF (pure white), `--foreground`→ink, `--muted-foreground`→ink-soft. Dark theme untouched (white-first product).

## 2. Typography Plan

- **Display face**: `font-sadn-display` utility → `--font-display: "Thamanya", "Cormorant Garamond", "Didot", "Bodoni MT", Georgia, serif`. Thamanya loads via `@font-face` (400/700) from `/fonts/Thamanya-Regular.woff2` + `/fonts/Thamanya-Bold.woff2`, `font-display: swap` (files arrive later; fallback is graceful).
- **Body face**: system sans (existing Geist stack) — keep UI text sans.
- Scale plan: Display `clamp(2.5rem, 8vw, 4rem)`; Heading-xl `1.875rem`; Heading `1.375rem`; Body `1rem`; Small/caption `0.8125rem`; Micro-label `0.6875rem` uppercase + `.tracking-luxe-tight`/`.tracking-luxe`.
- Helpers: `.tracking-luxe` (0.28em), `.tracking-luxe-tight` (0.14em). `text-balance` / `text-pretty` are native Tailwind v4 utilities — use directly.

## 3. Helper-Class Groups

**Group 1 — Safe area & touch**
- `.pb-safe` → `padding-bottom: env(safe-area-inset-bottom)`
- `.pb-safe-nav` → safe-area + `5.5rem` (clears the fixed bottom nav)
- `.tap-target` → `min-width/min-height: 44px` hit area

**Group 2 — App shell (fixed bottom nav, ready to consume)**
- `.app-nav-shell` → fixed bottom, z-50, white/85 + `backdrop-blur`, plum-100 hairline top, soft up-shadow, built-in safe-area padding
- `.app-nav-item` → 44×44 flex column, ink-soft; `.app-nav-item[data-active="true"]` → plum-800 + 4px dot via `::after`

**Group 3 — Editorial & texture**
- `.font-sadn-display`, `.tracking-luxe`, `.tracking-luxe-tight`
- `.bg-grain` → barely-visible plum dot grain (premium paper feel; stays essentially white)
- Micro-details already global: branded `::selection` (plum-800/#fff), thin plum scrollbar, `:focus-visible` outline plum-400 offset 2px
- Reduced motion: `@media (prefers-reduced-motion: reduce)` resets `[data-animate]`; future GSAP/Anime must gate on an `.anim-ready` html class added only when motion is preferred.

## Rules for Next Agents

1. Never hardcode hex in JSX — use `var(--sadn-*)` or `*-sadn-*` Tailwind utilities.
2. Bottom-nav screens: wrap scrollable content with `.pb-safe-nav`; nav itself uses `.app-nav-shell`.
3. Animations: tag elements `data-animate`, gate JS init behind `.anim-ready`.
4. `page.tsx` is still placeholder — do not build screens until requirements lock.
