# SADN (سدن) — Design Spec v0.1 (Foundation)

> Status: **Foundation locked** — architecture-independent layer only.
> The 5 UX questions (app shell, cards, hero, cart, language) are still with the user.
> Everything below is required by *any* answer combination and is safe to build against.

---

## 1. Brand Tokens (locked — see `src/app/globals.css` "SADN Brand Layer")

| Token | Hex | Role |
|---|---|---|
| `--sadn-plum-950` | `#2A1C28` | Ink / near-black text on light |
| `--sadn-plum-900` | `#3A2637` | Deep accent (hover states) |
| `--sadn-plum-800` | `#4B3249` | **PRIMARY BRAND — buttons, active nav, prices** |
| `--sadn-plum-700` | `#5C405A` | Primary hover |
| `--sadn-plum-600` | `#6E4F6B` | Secondary accents |
| `--sadn-plum-400` | `#A388A0` | Rings, focus, hairline emphasis |
| `--sadn-plum-200` | `#D5C7D2` | Borders, dividers, scrollbar |
| `--sadn-plum-100` | `#EDE6EB` | Chips, soft fills |
| `--sadn-plum-50` | `#F7F4F6` | Accent surface / badges |
| `--sadn-ivory` | `#FAF8F6` | Warm secondary surface |
| `--sadn-stone` | `#F1EDE9` | Tertiary surface / image bg |
| `--sadn-ink` | `#1C1719` | Headline text |
| `--sadn-ink-soft` | `#6B6266` | Body/muted text |

Canvas stays **pure white `#FFFFFF`**. Purple is an *accent*, never a wash.

## 2. Typography

- **Display/Headings:** `Thamanya` via `@font-face` → `/fonts/Thamanya-Regular.woff2` (400) + `/fonts/Thamanya-Bold.woff2` (700), `font-display: swap`. **Files pending from user** — drop into `public/fonts/` when they arrive; zero code changes needed.
- **Fallback stack:** `Cormorant Garamond → Didot → Bodoni MT → Georgia → serif` (utility: `font-sadn-display`).
- **Body:** system sans stack.
- **Tracking:** `.tracking-luxe` (0.28em, for eyebrows/labels), `.tracking-luxe-tight` (0.14em, for nav/buttons).
- **Scale plan (mobile-first):** display 44–56px · h1 34px · h2 26px · h3 20px · body 15px/1.7 · caption 12px uppercase.

## 3. App-Shell Helper CSS (ready, unexposed)

- `.app-nav-shell` + `.app-nav-item[data-active]` — fixed bottom nav with blur, hairline top border, plum dot indicator.
- `.pb-safe` / `.pb-safe-nav` — iOS safe-area + nav clearance.
- `.tap-target` — 44px minimum touch size.
- `.bg-grain` — near-invisible paper texture (optional surface).
- Branded `::selection`, plum scrollbar, `:focus-visible` plum ring.
- `prefers-reduced-motion` guard for future `[data-animate]` elements.

## 4. Motion Language (for the build phase — GSAP + Anime.js via npm)

- **Scroll (GSAP ScrollTrigger):** fade + rise 24px, 0.8s `power3.out`, stagger 0.08s; image reveals via clip-path inset; parallax ≤ 6% on hero.
- **Micro (Anime.js):** button press scale 0.96 → 1 with soft spring; cart badge bounce + count roll; nav transition = 250ms horizontal slide + fade; add-to-cart = fly-to-badge ghost image.
- All motion gated on `.anim-ready` + reduced-motion respect.

## 5. Data Layer (live now)

- Prisma `Product` model → SQLite (`db/custom.db`), seeded with 6 products.
- `GET /api/products` — filters: `category`, `featured`, `isNew`, `limit`. ✅ verified
- `GET /api/products/[slug]` — single product, 404-safe. ✅ verified
- JSON array fields decoded at API boundary by `src/lib/products.ts`.
- Product photography: 6 ghost-mannequin studio shots + 1 editorial hero (AI-generated placeholders in `/public/products/`, originals in `/download/products/`).

## 6. Default-If-Silent Answers (fallback only — NOT decisions yet)

| # | Question | Default if user silent |
|---|---|---|
| 1 | App shell | **C — Hybrid** (Home scrolling feed; Shop/Cart as screens) |
| 2 | Cards | Rounded 3:4, 2-col staggered grid; AI imagery already generated |
| 3 | Hero | A — logo-centric with floating product + parallax |
| 4 | Cart | C — mini bottom-sheet + full cart tab; fly-to-cart animation |
| 5 | Language | English-first UI with Arabic accents (سدن) in brand moments; RTL toggle deferred unless requested |

> These defaults flip to "decisions" only if the user's next reply is silent on them — documented per the GrillMe contract.
