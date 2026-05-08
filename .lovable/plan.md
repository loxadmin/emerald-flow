
# Termii-Inspired Premium Redesign

A staged redesign of Karbali Ads to match the calm, premium feel of termii.com — flat surfaces, generous whitespace, dotted dividers, hairline borders, illustrated empty states, and a single emerald accent. Both the landing page and the advertiser dashboard are covered.

## Design language (applied globally via tokens)

- **Type**: Keep Geist as primary; tighten heading scale (lighter weight, more generous line-height). No serifs.
- **Color**: Single emerald accent (`hsl(160 65% 32%)` light / `hsl(160 60% 45%)` dark) used only for primary actions, brand mark, and active states.
- **Surfaces**: Flat white cards, hairline 1px borders, dotted section separators (`border-dashed`), no heavy shadows. Dark mode mirrors with deep cool charcoal `hsl(220 12% 6%)` surfaces.
- **Radius**: 12–14px on cards, 999px on pills and primary CTAs (Termii uses pill buttons).
- **Buttons**: Solid emerald pill with subtle inner highlight; ghost outline pill for secondary.
- **Empty states**: Centered icon + line + caption ("No recent transaction recorded yet" pattern).
- **Numerics**: Tabular, slightly oversized for balances.

## Phase 1 — Design system refresh

- Update `src/index.css` tokens (radius, hairlines, emerald hue) and add new primitives: `.dotted-divider`, `.pill`, `.empty-state`, `.metric-tile`, `.section-card`.
- Update `tailwind.config.ts` radius scale and add `dashed` border helpers.
- Refresh `src/components/ui/button.tsx` variants: `default` becomes pill emerald, add `pill-outline`.

## Phase 2 — Landing page (Termii-alive feel, keep hero video)

Refresh `src/pages/Index.tsx` and `src/components/landing/LandingHero.tsx`:

- **Nav**: Floating pill nav (rounded-full, glass) with Karbali mark left, links center, "Log in" + emerald "Get Started" pill right.
- **Hero**: Keep `/hero-animation.mp4` as background, add stronger left-aligned headline, animated rotating word, single emerald CTA pill + ghost "View API docs". Add a thin live-status pill ("Migrating customers in real-time") overlayed.
- **Logo strip**: "Trusted by performance teams" — muted greyscale logos row.
- **Feature grid**: 4 flat cards with mono icon + short copy, dotted separators between rows.
- **How it works**: Numbered timeline with dotted vertical line (Termii setup-guide pattern).
- **Stats band**: Three big tabular numbers on a flat surface.
- **CTA band**: Emerald-tinted card with pill CTA.
- **Footer**: Refined columns, hairline top.

## Phase 3 — Dashboard shell (Termii sidebar feel)

Refresh `src/components/DashboardLayout.tsx`:

- Sidebar: white/dark surface, brand at top, **avatar tile** under brand showing user email/role, expandable nav groups with chevrons (like Termii's Engage/Wallet groups), emerald active pill on selected route.
- Topbar: Slimmer (52px), language/quick-menu placeholder removed, breadcrumb + "Send / Launch campaign" emerald pill on the right.
- Mobile: Bottom-sheet drawer with same grouped nav.

## Phase 4 — Page-level polish

- **Dashboard (`Dashboard.tsx`)**: Two-column overview — left = greeting + balance + "Fund wallet" pill + perf chart, right = Transaction History card with empty-state pattern, API key + Base URL cards underneath. Mirrors Termii overview screenshot.
- **Wallet (`Wallet.tsx`)**: Keep new fintech balance card, refine transaction table to use status pills (Successful/Pending/Failed/Reversed) with colored dots, dotted row dividers.
- **Ads (`Ads.tsx`) + CampaignDetail**: Card list with status pill, tabular metrics, hairline dividers.
- **Websites (`Websites.tsx`)**: Already on the new pattern — tighten pill verification states.
- **Create campaign flows**: Inherit new tokens, make stepper a thin numbered rail.

## Out of scope (this pass)

- Admin panel pages (separate request later).
- Auth pages — already on the split-shell.
- Public docs/blog — auto-inherits tokens.

## Technical notes

- All color/radius changes go through CSS variables in `src/index.css` — no component hardcodes.
- Pill button is added as a Button `variant="pill"` so existing `<Button>` usages don't break.
- Hero video file `/hero-animation.mp4` is reused as-is.
- Geist remains loaded via `index.html`.
- No DB or business-logic changes.

## Deliverable order

1. Tokens + button variants (Phase 1)
2. Dashboard shell + Dashboard/Wallet pages (Phases 3–4 core)
3. Landing page (Phase 2)
4. Remaining pages polish

Confirm and I'll start with Phase 1 immediately.
