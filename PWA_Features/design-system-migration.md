# Feature: Design System Migration (PWA only)

**Version:** v1.0
**Status:** PARKED — specced, not started. Resume when other delivery priorities clear.
**Scope:** Back-office Progressive Web App only — `src/app/(app)/**` and `src/app/(auth)/**`.
**Out of scope:** The public marketing site (`src/app/(public)/**`) — different audience, different visual language, leave alone.

---

## 1. Purpose

The PWA was built page-by-page using ad-hoc light/admin styling (`bg-white`, `border-slate-200`, blue/red/amber accents on white). On 2026-04-27 we adopted the WEBChecker-derived dark-glass design language as the canonical look-and-feel for the PWA — see [`/.agent/workflows/Development_Workflow/design_system.md`](../.agent/workflows/Development_Workflow/design_system.md) v2.0.

Every page shipped before that date predates the design system. This feature migrates them to comply.

The migration is parked deliberately. The PWA's functional surface is still expanding (Compliance Register, Inspections, Actions, Governance, Exports remain unbuilt). Restyling first would mean re-restyling later as new features land. The plan is:

1. Continue building features against the current ad-hoc styling
2. **New** features built after 2026-04-27 must follow the new design system from day one (no excuses — this is enforced by the `design_system.md` checklist in PRs)
3. When the feature surface is broadly complete, run this migration in a single concentrated effort across all legacy pages

That gives a clean visual cut-over rather than a slow drift through inconsistent states.

---

## 2. What "done" looks like

- Every page under `(app)` and `(auth)` matches the patterns in `design_system.md`
- The pre-shipping checklist in §11 of `design_system.md` passes for each page
- `globals.css` and `tailwind.config.ts` match the references in §9 and §10 of `design_system.md` exactly
- Shared `<Card>`, `<Button>`, `<Badge>`, `<Input>`, `<Label>`, `<Skeleton>` components exist under `src/components/ui/` and are used everywhere
- A `src/lib/animations.ts` module exports `staggerContainer` and `fadeInUp` framer-motion variants, used on every register/dashboard page
- Visual regression spot check: a manager opening the PWA on iOS Safari and macOS Chrome sees consistent dark glass throughout — no light/white panels, no slate borders

---

## 3. Inventory of non-conformant surfaces

Captured at the moment the design system was adopted. Anything new shipped after 2026-04-27 does **not** belong on this list (it must conform from day one).

### 3.1 Global chrome

| Surface         | Path                                              | Migration effort | Notes                                                                 |
| --------------- | ------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| AppShell        | `src/components/app/AppShell.tsx`                 | Low              | Wraps everything — adds the `body` background and `content-layer`     |
| Sidebar         | `src/components/app/Sidebar.tsx`                  | Medium           | Active nav state, layer toggles section, collapse behaviour           |
| Topbar          | `src/components/app/Topbar.tsx`                   | Low              | Mobile-only burger, app title                                          |
| Bottom nav      | `src/components/app/BottomNav.tsx`                | Low              | Mobile-only bottom bar with 4 items                                    |
| Mobile drawer   | `src/components/app/MobileDrawer.tsx`             | Medium           | Slide-in panel, secondary nav, layer toggles                           |

### 3.2 Pages

| Surface                | Path                                                                        | Migration effort | Notes                                                       |
| ---------------------- | --------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------- |
| Sign-in / sign-up      | `src/app/(auth)/**`                                                         | Low              | Clerk components — restyle via Clerk theming API            |
| Dashboard              | `src/app/(app)/dashboard/page.tsx`                                          | Low              | Placeholder cards — easy rebuild as glass metric cards      |
| Map                    | `src/app/(app)/map/[floorPlanId]/page.tsx` and `src/components/app/map/**`  | Medium           | Detail bar, bottom sheet, placement modal, zoom controls    |
| Settings → Asset Types | `src/app/(app)/settings/asset-types/AssetTypePanel.tsx`                     | Medium           | Table, inline form, archive section, conditional reveal     |
| Asset register         | `src/app/(app)/assets/AssetRegisterPanel.tsx`                               | Medium           | Table + filter chips + inline form + delete-confirm modal   |
| Asset detail           | `src/app/(app)/assets/[id]/page.tsx` + `AssetDocumentsCard.tsx`             | Medium           | Identity / lifecycle / compliance / location cards           |
| Document vault         | `src/app/(app)/documents/DocumentVaultPanel.tsx`                            | Medium           | Table + filter chips + delete-confirm modal                  |
| Document detail        | `src/app/(app)/documents/[id]/page.tsx`                                     | Medium           | PDF/image preview, identity / lifecycle / linked-to cards   |
| Document upload modal  | `src/components/app/documents/DocumentUploadModal.tsx`                      | Medium           | Drop zone, progress bar, form fields                         |

### 3.3 Loading and error states

Every `loading.tsx` and `error.tsx` under `(app)` uses light skeletons (`bg-slate-200`, `bg-gray-200`). All need to switch to `bg-white/10` glass skeletons per `design_system.md` §4.6.

| Path                                                              |
| ----------------------------------------------------------------- |
| `src/app/(app)/assets/loading.tsx`                                |
| `src/app/(app)/assets/error.tsx`                                  |
| `src/app/(app)/documents/loading.tsx`                             |
| `src/app/(app)/documents/error.tsx`                               |
| `src/app/(app)/settings/asset-types/loading.tsx` (if exists)      |
| `src/app/(app)/settings/asset-types/error.tsx` (if exists)        |

### 3.4 What does **not** need migrating

- Anything under `src/app/(public)/**` — explicitly out of scope
- Server-only files (server actions, API route handlers, schema, migrations) — these don't render UI
- The `seed.ts` script

---

## 4. Phased plan

The migration is **one feature** but executes in five phases. Each phase produces a working PWA — no half-finished states across deploys.

### Phase 1 — Foundations

Replace the global stylesheet and tailwind config in a single PR. After this lands, every page will visually break (text disappears against light cards, borders go invisible, etc.) — this is expected. Phase 2 fixes it.

**Deliverables:**

- `src/app/globals.css` — replaced with the canonical contents from `design_system.md` §9
- `tailwind.config.ts` — replaced with the canonical contents from `design_system.md` §10
- Add `framer-motion` dependency
- Create `src/lib/animations.ts` with `staggerContainer`, `fadeInUp`, `fadeIn` variants

**Risk:** This is the most disruptive single change in the migration. Land it on a Friday afternoon and immediately follow with Phase 2 over the weekend, or stage Phase 1 + Phase 2 as a single PR.

**Effort:** ~1 hour code, ~1 hour visual sanity check.

### Phase 2 — Shared component library

Build the canonical UI primitives. After this phase, all subsequent page migrations are mostly drop-in.

**Deliverables:**

- `src/components/ui/button.tsx` — variants `default`, `outline`, `ghost`, `destructive`, `link`; sizes `sm`, `default`, `lg`, `icon`
- `src/components/ui/card.tsx` — variants `default`, `elevated`, `interactive` + `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `src/components/ui/badge.tsx` — variants `default`, `success`, `warning`, `destructive`, `outline`
- `src/components/ui/input.tsx` — wraps `<input>` with `.form-input`
- `src/components/ui/label.tsx` — wraps `<label>` with `.form-label`
- `src/components/ui/skeleton.tsx` — `bg-white/10 animate-pulse rounded`
- `src/lib/utils.ts` — `cn()` helper if not already present (Tailwind merge)

Add `class-variance-authority` and `tailwind-merge` dependencies.

**Effort:** ~2 hours.

### Phase 3 — Global chrome

Restyle navigation surfaces. The user lives in this chrome on every page; getting it right is the biggest perceptual win.

**Deliverables (in order):**

1. `AppShell.tsx` — apply dark canvas, ensure children are wrapped in `content-layer`
2. `Sidebar.tsx` — glass surface, white/10 borders, `bg-primary-500/20` for active nav, neutral-300 idle, white hover. Layer toggles as small `<Badge>` toggles.
3. `Topbar.tsx` — glass-on-canvas, white text, primary-500 burger
4. `BottomNav.tsx` — glass surface with `border-t border-white/10`, primary-500 for active item, neutral-400 idle
5. `MobileDrawer.tsx` — glass slide-in, same active/idle treatment as sidebar

Auth pages (`(auth)/sign-in`, `(auth)/sign-up`) — Clerk's `<SignIn>` and `<SignUp>` are styled via Clerk's `appearance` prop. Apply a dark theme matching the canvas (Clerk supports CSS variables for this).

**Effort:** ~4 hours.

### Phase 4 — Page surfaces

Sweep through every PWA page. Each page is a small PR (~30 min each) — easy to review, easy to revert if something goes wrong.

**Order:** simplest first to build confidence, complex last.

1. **Dashboard** — placeholder, ~15 min
2. **Sign-in / Sign-up** — Clerk theme, ~30 min
3. **Settings → Asset Types** — table, form, archive section, ~45 min
4. **Document detail** — preview + cards, ~30 min
5. **Document vault** — table + filters + modal, ~45 min
6. **Document upload modal** — drop zone + progress, ~30 min
7. **Asset detail** — identity / lifecycle / compliance / location cards, ~45 min
8. **Asset register** — table + filters + inline form + delete confirm, ~1 hour
9. **Map** — detail bar / bottom sheet / placement modal, ~1 hour
10. **`loading.tsx` and `error.tsx` files** — sweep, ~30 min total

**Effort:** ~6 hours for all of Phase 4.

### Phase 5 — Motion layer

Once everything is structurally correct, add the entry animations. This is the polish pass.

**Deliverables:**

- Each register page (Assets, Documents) wraps its grid/table in a `motion.div` with `staggerContainer` + `fadeInUp` per child
- Dashboard metric cards animate in with the same pattern
- Detail pages fade in (no stagger needed — single column)
- Interactive cards (clickable rows) get `whileHover={{ y: -4 }}`

**Effort:** ~1 hour.

### Total effort estimate

~14 hours of focused work end-to-end. Realistic calendar: one concentrated week (a sprint) or two relaxed weeks part-time.

---

## 5. Per-PR conventions

To keep the migration reviewable:

- One phase = one branch; phases land in order
- Phase 4 pages each get their own commit on the phase branch (so individual pages can be reverted)
- Every PR description includes a before/after screenshot pair for the affected surface
- Every PR ticks off the relevant rows in `design_system.md` §11 in its description

---

## 6. Risks and mitigations

| Risk                                                                 | Mitigation                                                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Phase 1 ships and Phase 2 doesn't follow within hours → broken PWA   | Stage as one PR, or schedule Phases 1+2 in the same window with no other in-progress work      |
| New features land during the migration with old styling              | Forbidden — once Phase 1 ships, all new code uses the new system. PR reviewers enforce.        |
| Backdrop-filter performance on older mobile devices                  | Already accepted in `design_system.md`; if real issues arise, add `@supports not (backdrop-filter)` fallbacks  |
| Map floor-plan rendering colour balance changes against dark canvas  | Map canvas is now black/dark — verify floor-plan SVG contrast still acceptable; add a subtle lightening filter on the floor plan if needed |
| Clerk auth components don't theme cleanly                            | Clerk `appearance` prop is well-documented; if it can't match exactly, accept slight delta as a v1.1 follow-up |
| Reduced-motion users see no animation                                | Already handled by the `prefers-reduced-motion` rule in `globals.css` §9                       |

---

## 7. Pre-flight before resuming

When this feature is unparked, run these checks first:

1. Reread `design_system.md` end-to-end — patterns may have evolved
2. Audit §3 inventory — list any new files added since 2026-04-27 that need migrating (and any that have been deleted)
3. Confirm no in-flight feature work is touching the same surfaces — coordinate with whatever is shipping
4. Decide whether Phase 1 + Phase 2 ship as one PR or two; book the calendar slot

---

## 8. Out of scope (for clarity)

These are explicitly **not** part of this feature:

- Public marketing site styling (`src/app/(public)/**`) — separate, intentional, leave alone
- Email templates (Clerk transactional emails)
- PDF report generation styling (when reports/exports module ships, that's its own design effort)
- Print stylesheets — not currently in the product
- Dark/light theme toggle — the PWA is dark-only by design (the `design_system.md` philosophy section justifies this)

---

## Changelog

| Version | Date       | Change                                                                                                  |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| v1.0    | 2026-04-27 | Initial spec — five-phase migration plan, inventory of non-conformant surfaces, parked status confirmed |
