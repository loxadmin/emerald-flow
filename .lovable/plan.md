
# Premium Redesign — Termii-inspired

A focused redesign that brings the entire advertiser experience to a Termii-grade fintech/adtech feel: dark emerald sidebar, soft white content surfaces, generous whitespace, pill CTAs, calm typography, and a hero-driven landing page. Day/night mode preserved. Navbar style untouched.

## Design language (codified in tokens)

- **Sidebar (both modes)**: deep emerald-tinted near-black (`#0B1F17`-style) with emerald active pill, white content canvas — exactly the Termii split.
- **Surfaces**: ultra-soft cards, 1px hairline borders, very subtle shadow, 16–20px radius.
- **CTAs**: filled emerald pill buttons with rounded-full corners and a confident weight (matches "Send Message" / "Send now" / "Top-up" buttons in references).
- **Typography**: keep Geist; tighten to a calmer scale — display 36–44, h2 24–28, body 14–15, eyebrow 11 uppercase tracking-wide. Tabular numerics for all money/metrics.
- **Dividers**: dashed hairline separators (Termii signature) used between header and content.
- **Iconography**: thin, two-tone — emerald accents on muted backgrounds.
- **Motion**: framer-motion subtle rises (8–12px, 400–500ms), no bouncy effects.

## Scope (this pass)

### 1. Design tokens & primitives
- Refine `src/index.css`: introduce `--sidebar-emerald` token for the dark emerald sidebar in both light/dark modes (sidebar stays dark in light mode like Termii).
- Add `.btn-pill`, `.divider-dashed`, `.eyebrow-soft`, refined `.surface` shadow.
- Tighten heading scale.

### 2. Landing page (`src/pages/Index.tsx` default variant + `LandingHero`)
- Keep hero video + don't touch navbar markup/behavior.
- Rebuild hero copy block: smaller eyebrow chip, larger restrained headline (Geist semibold, tight tracking), tighter subtitle width, two pill CTAs (filled emerald + ghost outline).
- Add a "Trusted by" logo strip directly under hero (Termii pattern) using existing brand text marks (no new assets).
- Replace tacky feature cards with a clean 4-up "capability grid" — flat icons, hairline borders, no gradient blobs.
- Rework "How it works" to a calm numbered list (left-aligned, dashed connectors), drop the floating purple/emerald blobs and 3D cards.
- Tighten contact section to a centered card on a quiet surface.
- Footer stays.

### 3. App shell (`DashboardLayout.tsx`)
- Sidebar: switch to deep emerald-tinted dark in BOTH themes (Termii uses dark sidebar even in light mode). Logo wordmark, grouped nav with section labels ("OVERVIEW", "ENGAGE", "WALLET"), active state = filled emerald pill, inactive = soft white/70.
- Topbar: remove heavy chrome — just breadcrumb + theme toggle + wallet chip + avatar, separated from content by a dashed hairline.
- Mobile: drawer mirrors the same dark sidebar styling.

### 4. Dashboard pages (advertiser surfaces)
- `Dashboard.tsx`: rebuild the overview header (eyebrow + large welcome line + balance pill + "Fund Wallet" pill CTA on the right). Stat cards become flat with hairline borders, large tabular numerics, tiny delta chip.
- `Wallet.tsx`: keep recent fintech card but soften — remove heavy radial overload, lean into one calm gradient panel, dashed divider before transactions, status chips already shipped.
- `Websites.tsx`, `Ads.tsx`, `CampaignDetail.tsx`: apply new header pattern (eyebrow + title + actions row), hairline cards, pill buttons. No structural changes.

## Out of scope (this pass)
- Admin panel pages
- Marketing sub-pages (About, UseCases, Docs, Blog)
- Auth pages (Login/Signup) — already on the new shell
- Campaign create flows — inherit tokens automatically

If results land well, a follow-up pass can extend the same language to Admin and the marketing sub-pages.

## Technical notes

- All colors stay HSL via `index.css` tokens; no hardcoded colors in components.
- `--sidebar-background` becomes the deep emerald-dark in both themes; `--sidebar-foreground` stays light.
- New utility classes: `.btn-pill`, `.divider-dashed`, `.card-soft`, `.metric-delta-up`, `.metric-delta-down`.
- Framer-motion already installed; reuse `MotionWrapper` for hero/sections.
- No business-logic changes, no DB migrations, no route changes.

## Files touched

```text
src/index.css                              tokens, primitives
tailwind.config.ts                          (only if new color name needed)
src/components/DashboardLayout.tsx          shell + sidebar + topbar
src/components/landing/LandingHero.tsx      hero block (video kept)
src/pages/Index.tsx                         default landing layout
src/pages/Dashboard.tsx                     overview redesign
src/pages/Wallet.tsx                        soften balance panel
src/pages/Websites.tsx                      header + cards
src/pages/Ads.tsx                           header + cards
src/pages/CampaignDetail.tsx                header + summary cards
```
