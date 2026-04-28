---
description: Single source of truth for visual style, component patterns, motion, and CSS conventions across the Premises Asset Map back-office PWA.
---

# Design System

> **One source of truth for the PWA.** Every page, component, and feature inside the back-office app must follow this document. If you find yourself reaching for a hex code or a one-off Tailwind utility that breaks the patterns below, stop and update this doc first.

---

## Scope

**This design system applies only to the back-office Progressive Web App.** That means:

| Area                                       | Path                            | Applies?    |
| ------------------------------------------ | ------------------------------- | ----------- |
| Authenticated PWA (asset map, registers, settings, dashboard) | `src/app/(app)/**`              | ✅ Yes      |
| Sign-in / sign-up flows (entry to the PWA) | `src/app/(auth)/**`             | ✅ Yes      |
| Public marketing website                   | `src/app/(public)/**`           | ❌ No — separate visual language |

The public marketing site is outside the scope of this document and intentionally uses a different aesthetic to do its job (acquisition, conversion, SEO). Do not apply the dark-glass patterns below to public routes, and do not apply public marketing patterns to the PWA.

If you are uncertain whether a route is PWA or public, check its parent route group: `(app)` and `(auth)` are PWA, `(public)` is not.

---

## Table of contents

1. [Design philosophy](#1-design-philosophy)
2. [Foundations](#2-foundations)
   - 2.1 Background and texture
   - 2.2 Colour palette
   - 2.3 Typography
   - 2.4 Spacing and layout
3. [Surfaces](#3-surfaces)
   - 3.1 The glass card (cornerstone pattern)
   - 3.2 Card variants
   - 3.3 Page container
4. [Components](#4-components)
   - 4.1 Buttons
   - 4.2 Form inputs
   - 4.3 Badges and status pills
   - 4.4 Tables
   - 4.5 Modals
   - 4.6 Empty, loading, and error states
5. [Iconography](#5-iconography)
6. [Motion](#6-motion)
7. [Mobile patterns](#7-mobile-patterns)
8. [Accessibility baseline](#8-accessibility-baseline)
9. [globals.css reference](#9-globalscss-reference)
10. [tailwind.config.ts reference](#10-tailwindconfigts-reference)
11. [Pre-shipping checklist](#11-pre-shipping-checklist)
12. [Migration notes](#12-migration-notes)

---

## 1. Design philosophy

Three words: **calm**, **dense**, **premium**.

This is a back-office compliance app — trustees, hall managers, and auditors will spend hours in it scanning lists of certificates, inspection due dates, and asset registers. The aesthetic must feel:

- **Calm** — dark canvas, low-saturation surfaces, no visual noise unless something genuinely needs attention (overdue, expiring, error).
- **Dense without crowding** — small numerals, generous line-height, glass cards that group information without harsh borders.
- **Premium** — subtle blur, gentle glow on interactive surfaces, smooth transitions. The trust is paying for serious software; it should feel that way.

Anti-patterns to avoid:

- ❌ Light/white backgrounds for primary content surfaces (use glass on dark instead)
- ❌ Loud accent colours used decoratively (accent colours are reserved for **state**: success, warning, danger)
- ❌ Hard 1-pixel slate borders everywhere — use `border-white/10` for whisper separation
- ❌ Any `mix-blend-*` or `backdrop-filter: none` overrides
- ❌ Custom keyframe animations beyond what's in this doc

---

## 2. Foundations

### 2.1 Background and texture

The app canvas is a fixed dark radial gradient with a faint grid overlay. This sits behind every authenticated page.

```css
/* Applied to <body> globally */
background: radial-gradient(circle at top center, rgb(26, 26, 46) 0%, rgb(0, 0, 0) 100%);
background-attachment: fixed;
```

A `body::before` pseudo-element draws a 50px × 50px grid in `rgba(255,255,255,0.03)` to add depth without distracting. **All page content must be wrapped in `.content-layer`** (a `position: relative; z-index: 1` utility) so it sits above the grid.

```tsx
<main className="container mx-auto px-4 py-8 content-layer">
  {/* page content */}
</main>
```

Every PWA route — `(app)` and `(auth)` — gets the dark canvas. Public marketing routes (`(public)`) are out of scope (see Scope at top of doc).

### 2.2 Colour palette

The palette has three layers:

#### Layer 1 — Canvas tokens

| Token            | Value                             | Used for                              |
| ---------------- | --------------------------------- | ------------------------------------- |
| Canvas top       | `rgb(26, 26, 46)`                 | Top of radial gradient                |
| Canvas bottom    | `rgb(0, 0, 0)`                    | Bottom of radial gradient             |
| Grid line        | `rgba(255, 255, 255, 0.03)`       | Texture overlay only                  |

#### Layer 2 — Surface tokens (Tailwind-extended)

| Token                | Value                              | Used for                                    |
| -------------------- | ---------------------------------- | ------------------------------------------- |
| `bg-white/5`         | `rgba(255, 255, 255, 0.05)`        | Default glass card background               |
| `bg-white/10`        | `rgba(255, 255, 255, 0.10)`        | Hover state on glass cards                  |
| `border-white/10`    | `rgba(255, 255, 255, 0.10)`        | Default card / panel border                 |
| `border-white/20`    | `rgba(255, 255, 255, 0.20)`        | Inputs, stronger separation                 |

#### Layer 3 — Semantic tokens (Tailwind palette)

The full Tailwind blue scale is registered as `primary-*`. Status colours use full strength on text/icons and 10–30 % alpha on backgrounds and borders.

| Role           | Surface (bg/border)              | Text / icon            | Used for                                     |
| -------------- | -------------------------------- | ---------------------- | -------------------------------------------- |
| Primary CTA    | `bg-primary-500` / hover `-600`  | `text-white`           | Main action buttons                          |
| Primary accent | `bg-primary-500/20`              | `text-primary-400`     | Selected nav, info chips, icon containers    |
| Success        | `bg-green-500/10`, `border-green-500/30` | `text-green-400`       | Active, compliant, expiring `> 30d`          |
| Warning        | `bg-yellow-500/10`, `border-yellow-500/30` | `text-yellow-400`      | Due soon, expiring `≤ 30d`, action required  |
| Danger         | `bg-red-500/10`, `border-red-500/30`     | `text-red-400`         | Overdue, expired, destructive confirms       |
| Neutral muted  | `bg-white/5`, `border-white/10`  | `text-neutral-400`     | Archived, decommissioned, disabled            |

#### Text colour rules

| What                                | Class                |
| ----------------------------------- | -------------------- |
| H1, H2, primary metrics             | `text-white`         |
| H3, table headers, secondary titles | `text-white` or `text-neutral-200` |
| Body copy                           | `text-neutral-300`   |
| Labels, captions, helper text       | `text-neutral-400`   |
| Placeholder, disabled, "—" empty    | `text-neutral-500`   |

**Never** use `text-slate-*`, `text-gray-*`, or any other grey scale outside `text-neutral-*` and `text-white` on dark surfaces.

### 2.3 Typography

System fonts only — no custom font loading. Tailwind's defaults are fine: `font-sans` for everything.

| Element                 | Class                                         |
| ----------------------- | --------------------------------------------- |
| `h1` page title         | `text-3xl md:text-4xl font-semibold text-white tracking-tight` |
| `h2` section header     | `text-xl font-semibold text-white`            |
| `h3` card title         | `text-base font-medium text-white`            |
| Eyebrow / overline      | `text-xs font-medium text-neutral-400 uppercase tracking-wide` |
| Metric value            | `text-3xl font-bold text-white`               |
| Metric label            | `text-sm text-neutral-400`                    |
| Body copy               | `text-sm text-neutral-300`                    |
| Caption / helper text   | `text-xs text-neutral-400`                    |
| Inline code / serial    | `font-mono text-xs text-neutral-400`          |

Headings are **never** `font-black` and **never** `font-serif`. Page hierarchy comes from size and colour, not weight contrast.

One `<h1>` per page, always.

### 2.4 Spacing and layout

The app uses Tailwind's default 4-pixel spacing scale. Patterns:

| Surface                         | Padding                         | Gap inside                  |
| ------------------------------- | ------------------------------- | --------------------------- |
| Page outer container            | `container mx-auto px-4 py-8`   | n/a                         |
| Card                            | `p-6` (default), `p-4` (compact) | `space-y-4` between elements |
| Card header → content           | `space-y-1.5` then `pt-0`       | n/a                         |
| Modal                           | `p-5` body, `px-5 py-4` for header / footer borders | n/a |
| Form (sections)                 | `space-y-4` between inputs      | n/a                         |
| Filter row                      | `p-3` with `gap-3` flex         | n/a                         |

Page width: `max-w-7xl` for dashboards and registers, `max-w-6xl` for detail pages, `max-w-5xl` for forms or article-style content. Never exceed `max-w-7xl` on any authenticated route.

---

## 3. Surfaces

### 3.1 The glass card — cornerstone pattern

Every grouped piece of content lives inside a **glass card**. This is the single most important pattern in the system.

```tsx
<div className="glass rounded-xl border border-white/10 p-6 content-layer">
  {/* card content */}
</div>
```

What `.glass` does (from `globals.css`):

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

The blur picks up the radial gradient behind it, giving each card a sense of depth without resorting to a solid colour. The `border border-white/10` from the wrapper combines with the inline border to give a 1-pixel softly-lit edge.

**Always** include `content-layer` on a card — it ensures the card sits above the grid texture.

### 3.2 Card variants

Three variants, used through a shared `<Card>` component (`src/components/ui/card.tsx`). Each adds a different interaction affordance.

| Variant       | Class extension                               | When to use                                    |
| ------------- | --------------------------------------------- | ---------------------------------------------- |
| `default`     | `border-white/10`                             | Static information, list rows, summary panels  |
| `elevated`    | `border-white/10 glass-hover`                 | Hover lifts background opacity slightly        |
| `interactive` | `border-white/10 glass-hover cursor-pointer hover:glow-blue` | Whole card is clickable (e.g. an asset row that links to detail) |

`.glass-hover` uses `transition-all duration-300` and on hover bumps `bg` to `rgba(255,255,255,0.10)` and the border to a soft blue. `.glow-blue` adds an outer blue box-shadow.

#### Standard card structure

```tsx
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Identity</CardTitle>
    <CardDescription>Serial, manufacturer, model</CardDescription>
  </CardHeader>
  <CardContent>
    {/* fields */}
  </CardContent>
</Card>
```

The `<CardHeader>` uses `p-6 pb-2`, content uses `p-6 pt-0`, footer (if any) uses `p-6 pt-0`.

#### Metric / score card pattern

For dashboards — icon, label, large value, optional trend.

```tsx
<Card variant="elevated">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium text-neutral-400">Overdue inspections</CardTitle>
    <AlertCircle className="h-4 w-4 text-red-400" />
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold text-white">12</p>
    <p className="mt-2 text-xs text-neutral-400">Across 4 asset types</p>
  </CardContent>
</Card>
```

### 3.3 Page container

Every authenticated page starts with the same wrapper:

```tsx
<main className="container mx-auto px-4 py-8 content-layer">
  <h1 className="text-3xl font-semibold text-white tracking-tight mb-6">Page Title</h1>
  {/* …content… */}
</main>
```

For pages with a primary action button in the header:

```tsx
<div className="flex items-center justify-between mb-6">
  <h1 className="text-3xl font-semibold text-white tracking-tight">Assets</h1>
  <button className="btn-primary">Add Asset</button>
</div>
```

---

## 4. Components

### 4.1 Buttons

Use the shared `<Button>` component (`src/components/ui/button.tsx`) — **never** assemble button styles inline.

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm" variant="default">Small</Button>
<Button size="icon" variant="ghost"><Trash2 size={14} /></Button>
```

Variants:

| Variant       | Tailwind                                                            |
| ------------- | ------------------------------------------------------------------- |
| `default`     | `bg-primary-500 text-white hover:bg-primary-600`                    |
| `outline`     | `border border-white/20 bg-white/5 text-white hover:bg-white/10`    |
| `ghost`       | `text-neutral-300 hover:bg-white/5 hover:text-white`                |
| `destructive` | `bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30` |
| `link`        | `text-primary-400 underline-offset-4 hover:underline`               |

Sizes: `sm` (h-9), `default` (h-10), `lg` (h-11). Minimum touch target on mobile is 44 × 44 px — use `size="lg"` or icon buttons with explicit `min-w-[44px] min-h-[44px]`.

### 4.2 Form inputs

All form elements use the `.form-*` utility classes defined in `globals.css`. **Never** apply raw Tailwind utilities to `<input>`, `<select>`, `<textarea>`, or `<label>` directly.

```tsx
<label htmlFor="asset-name" className="form-label">Asset name</label>
<input id="asset-name" type="text" className="form-input" />

<label htmlFor="asset-type" className="form-label">Type</label>
<select id="asset-type" className="form-select">…</select>

<label htmlFor="notes" className="form-label">Notes</label>
<textarea id="notes" className="form-textarea" />

<input id="archive" type="checkbox" className="form-checkbox" />
<label htmlFor="archive" className="text-sm text-neutral-300">Archive after save</label>
```

Dark-themed input styling (defined once in `globals.css` — see §9):

- Background: `bg-white/5`
- Border: `border-white/20`
- Text: `text-white`
- Placeholder: `text-neutral-500`
- Focus ring: `focus:ring-2 focus:ring-primary-500 focus:border-primary-500`
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

Required-field indicator: red asterisk after the label text.

```tsx
<label className="form-label">
  Name <span className="text-red-400">*</span>
</label>
```

Error messages sit immediately under the input with `role="alert"`:

```tsx
{error && <p role="alert" className="mt-1 text-sm text-red-400">{error}</p>}
```

#### Reveal patterns (conditional fields)

Use the CSS-grid height-transition pattern — no `display: none`, no JS height measurement:

```tsx
<div
  className={`grid transition-all duration-300 ease-in-out ${
    isOpen ? 'grid-expand-open' : 'grid-expand-closed'
  }`}
>
  <div className="overflow-hidden">
    <div className={`transition-all duration-300 ${isOpen ? 'pt-3 opacity-100' : 'pt-0 opacity-0'}`}>
      {/* hidden content */}
    </div>
  </div>
</div>
```

`.grid-expand-open` and `.grid-expand-closed` are utility classes in `globals.css`.

### 4.3 Badges and status pills

Use the shared `<Badge>` component (`src/components/ui/badge.tsx`).

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Due soon</Badge>
<Badge variant="destructive">Overdue</Badge>
<Badge variant="default">Archived</Badge>
```

Variants:

| Variant       | Class                                                                |
| ------------- | -------------------------------------------------------------------- |
| `default`     | `border-white/20 bg-white/10 text-white`                             |
| `success`     | `border-green-500/30 bg-green-500/10 text-green-400`                 |
| `warning`     | `border-yellow-500/30 bg-yellow-500/10 text-yellow-400`              |
| `destructive` | `border-red-500/30 bg-red-500/10 text-red-400`                       |
| `outline`     | `text-white border-white/30 bg-transparent`                          |

Shape: `rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide`.

Always include screen-reader-only context where the badge stands alone:

```tsx
<Badge variant="destructive">
  <span className="sr-only">Status: </span>Overdue
</Badge>
```

#### Status logic

The mapping from a domain value to a badge variant is documented per-feature, but the four canonical states are:

| State        | Variant       | Trigger                                                |
| ------------ | ------------- | ------------------------------------------------------ |
| Active       | `success`     | Compliant, no expiry within 30 days                    |
| Due soon     | `warning`     | Expiry / next inspection within 30 days (future)       |
| Overdue      | `destructive` | Expiry / next inspection in the past                   |
| Archived     | `default`     | Soft-deleted, retained for audit                       |

### 4.4 Tables

Tables on dark surfaces use a glass wrapper and `divide-y divide-white/5` for row separators.

```tsx
<div className="glass rounded-xl border border-white/10 overflow-hidden content-layer">
  <table className="min-w-full divide-y divide-white/5">
    <thead className="bg-white/[0.03]">
      <tr>
        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wide">
          Column
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-white/5">
      <tr className="hover:bg-white/[0.03]">
        <td className="px-4 py-3 text-sm text-white">Cell</td>
      </tr>
    </tbody>
  </table>
</div>
```

Mobile: never let tables overflow horizontally — switch to a card-per-row layout below `sm:`. The pattern:

```tsx
<table className="hidden sm:table …">…</table>
<ul className="sm:hidden divide-y divide-white/5">…</ul>
```

### 4.5 Modals

Modals use a glass surface over a `bg-black/60` backdrop.

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
  <div className="glass rounded-xl border border-white/10 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto content-layer">
    <header className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 backdrop-blur">
      <h2 className="text-base font-semibold text-white">Title</h2>
      <button aria-label="Close" className="text-neutral-400 hover:text-white">
        <X size={18} />
      </button>
    </header>
    <div className="p-5 space-y-4">{/* body */}</div>
    <footer className="flex gap-3 px-5 py-4 border-t border-white/10 sticky bottom-0 backdrop-blur">
      <Button variant="outline" className="flex-1">Cancel</Button>
      <Button variant="default" className="flex-1">Confirm</Button>
    </footer>
  </div>
</div>
```

Destructive confirm modals replace the primary button with `variant="destructive"` and add a body explanation that names the consequence ("This permanently removes the record").

### 4.6 Empty, loading, and error states

#### Empty

```tsx
<div className="glass rounded-xl border border-white/10 p-12 text-center content-layer">
  <p className="text-sm text-neutral-400 mb-4">{message}</p>
  <Button variant="default">{primaryActionLabel}</Button>
</div>
```

#### Loading skeleton

Use `bg-white/10` for skeleton blocks with `animate-pulse`. Mirror the structure of the real layout — same widths, same gaps — so the page does not jump on load.

```tsx
<div className="glass rounded-xl border border-white/10 divide-y divide-white/5 content-layer">
  {Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="flex items-center gap-4 px-4 py-3">
      <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
        <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
      </div>
    </div>
  ))}
</div>
```

#### Error

```tsx
<div className="flex flex-col items-center justify-center py-20 text-center">
  <p className="text-sm text-neutral-400 mb-4">Could not load. Please refresh.</p>
  <Button variant="default" onClick={reset}>Try again</Button>
</div>
```

---

## 5. Iconography

`lucide-react` is the only icon library. All icons use stroke style (the lucide default), never filled.

| Context                     | Size           | Colour                |
| --------------------------- | -------------- | --------------------- |
| In a button (next to text)  | `size={14}`    | inherits from button  |
| Section header eyebrow      | `size={16}`    | `text-neutral-400`    |
| Metric card                 | `size={20}`    | accent (e.g. `text-primary-400`) |
| Empty state hero            | `size={32}`    | `text-neutral-500`    |
| Inline status               | `size={12}–14` | matches badge colour  |

Icon containers in metric cards use the rounded-square pattern with matched-tint borders:

```tsx
<div className="rounded-lg bg-primary-500/20 p-2 border border-primary-500/30">
  <Activity className="h-5 w-5 text-primary-400" />
</div>
```

Map the colour family to the metric domain — primary/blue for general info, green/yellow/red for status counts.

---

## 6. Motion

`framer-motion` is the only animation library. The CSS keyframe animations registered in `tailwind.config.ts` (`fade-in`, `slide-up`, `scale-in`, `shimmer`) are available as Tailwind classes for non-React elements (skeleton loaders, attention hints).

### 6.1 Page entry — staggered children

For pages with a grid of cards (dashboards, registers), wrap the parent in a `motion.div` with the shared `staggerContainer` variant:

```tsx
'use client';
import { motion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/lib/animations';

<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
  className="grid grid-cols-1 md:grid-cols-3 gap-4"
>
  {items.map((item) => (
    <motion.div key={item.id} variants={fadeInUp}>
      <Card>{/* … */}</Card>
    </motion.div>
  ))}
</motion.div>
```

Variants are defined once in `src/lib/animations.ts`:

- `staggerContainer` — `staggerChildren: 0.05, delayChildren: 0.1`
- `fadeInUp` — `y: 20 → 0`, `opacity: 0 → 1`, `duration: 0.4`

### 6.2 Hover lifts

Cards that link to a detail page lift slightly on hover:

```tsx
<motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
  <Card variant="interactive">{/* … */}</Card>
</motion.div>
```

### 6.3 Shimmer for loading

Use the `.shimmer` utility for "we're working on it" surfaces (e.g. a card waiting on async data). It's a 2-second linear sweep of soft blue light. Do not use it for skeletons (those use `animate-pulse`).

### 6.4 Reduced motion

Always respect `prefers-reduced-motion`. Framer Motion does this automatically when `useReducedMotion()` is consulted; for raw CSS animations, gate with the media query in `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Mobile patterns

- **Mobile-first.** Build at `xs` then layer up with `sm:`, `md:`, `lg:` prefixes. Never `flex-row` without an `md:` qualifier.
- **Touch targets ≥ 44 × 44 px.** Icon buttons get `min-w-[44px] min-h-[44px] flex items-center justify-center` on small screens.
- **Tables become cards** below `sm:` (see §4.4).
- **Sticky bottom action bar** for primary actions on detail pages on mobile:

```tsx
<div className="fixed bottom-0 left-0 right-0 p-4 backdrop-blur bg-black/40 border-t border-white/10 z-40 md:relative md:bg-transparent md:border-t-0 md:backdrop-blur-none">
  <Button variant="default" className="w-full">Primary</Button>
</div>
```

- **Bottom sheets** for filter / detail panels — slide up from the bottom, full-width, glass background.
- **No horizontally scrolling tables** ever.

---

## 8. Accessibility baseline

Every page must pass these before merge:

- One `<h1>` per page; heading hierarchy never skips levels
- All interactive elements reachable by Tab, escapable by Esc (modals)
- Focus ring visible on all buttons, links, inputs (`focus-visible:ring-2 focus-visible:ring-primary-500`)
- Form inputs paired with `<label htmlFor>` — no orphan `placeholder` as a label
- Icon-only buttons have `aria-label`
- Status badges include screen-reader-only context: `<span className="sr-only">Status: </span>Overdue`
- Error messages use `role="alert"`
- Loading regions use `aria-live="polite"` when they update mid-interaction
- Colour contrast: 4.5:1 minimum for body text, 3:1 for large headings (the dark canvas + `text-neutral-300` body meets this; `text-neutral-500` is for placeholder/disabled only)
- Animations respect `prefers-reduced-motion` (see §6.4)
- Touch targets ≥ 44 × 44 px on mobile

---

## 9. globals.css reference

This is the canonical contents of `src/app/globals.css`. Anything beyond this should be added through this document first.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }

  body {
    @apply text-white;
    background: radial-gradient(circle at top center, rgb(26, 26, 46) 0%, rgb(0, 0, 0) 100%);
    background-attachment: fixed;
    position: relative;
    min-height: 100dvh;
  }

  /* Subtle 50px grid texture overlay */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
    z-index: 0;
  }

  /* Respect reduced-motion preference */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}

@layer components {
  /* Form elements — dark-theme defaults */
  .form-label {
    @apply block text-sm font-medium text-neutral-300 mb-1;
  }

  .form-input,
  .form-select,
  .form-textarea {
    @apply block w-full rounded-md
           bg-white/5 border border-white/20
           px-3 py-2 text-sm text-white placeholder-neutral-500
           transition-colors
           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
           disabled:cursor-not-allowed disabled:opacity-50;
  }

  .form-textarea {
    @apply resize-y min-h-[80px];
  }

  .form-checkbox {
    @apply h-4 w-4 rounded border border-white/20 bg-white/5
           text-primary-500
           focus:ring-2 focus:ring-primary-500 focus:ring-offset-0
           disabled:cursor-not-allowed disabled:opacity-50;
  }
}

@layer utilities {
  /* Premium glassmorphism — the cornerstone surface */
  .glass {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .glass-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .glass-hover:hover {
    background: rgba(255, 255, 255, 0.10);
    border-color: rgba(59, 130, 246, 0.3);
    box-shadow: 0 8px 32px 0 rgba(59, 130, 246, 0.2);
  }

  /* Shimmer sweep — for "working on it" surfaces */
  .shimmer {
    position: relative;
    overflow: hidden;
  }

  .shimmer::after {
    content: '';
    position: absolute;
    inset: 0;
    transform: translateX(-100%);
    background: linear-gradient(
      90deg,
      rgba(59, 130, 246, 0) 0,
      rgba(59, 130, 246, 0.15) 50%,
      rgba(59, 130, 246, 0) 100%
    );
    animation: shimmer 2s infinite;
  }

  /* Soft blue glow — for hover-active interactive cards */
  .glow-blue {
    box-shadow:
      0 0 20px rgba(59, 130, 246, 0.4),
      0 0 40px rgba(59, 130, 246, 0.2);
  }

  /* Lift content above the body::before grid */
  .content-layer {
    position: relative;
    z-index: 1;
  }

  /* CSS-grid height transition for expand/collapse panels — see §4.2 */
  .grid-expand-open   { grid-template-rows: 1fr; }
  .grid-expand-closed { grid-template-rows: 0fr; }
}
```

---

## 10. tailwind.config.ts reference

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'scale-in': 'scale-in 0.4s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'scale-in': {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 11. Pre-shipping checklist

Run through this before raising any PR with UI changes.

### Structure

- [ ] Page wrapped in `<main className="container mx-auto px-4 py-8 content-layer">`
- [ ] Single `<h1>` per page using the canonical class string
- [ ] Heading hierarchy doesn't skip levels (h1 → h2 → h3)

### Surfaces

- [ ] All grouped content lives in a `.glass rounded-xl border border-white/10` card
- [ ] Tables wrapped in a glass container; mobile fallback to card list below `sm:`
- [ ] Modals use glass surface + `bg-black/60` backdrop

### Colour

- [ ] No raw hex codes anywhere in the diff
- [ ] No `text-slate-*` or `text-gray-*` — only `text-neutral-*` and `text-white`
- [ ] Status colours follow the Active / Due soon / Overdue / Archived mapping
- [ ] Borders use `border-white/10` (light separation) or `border-white/20` (inputs)

### Components

- [ ] Buttons use the `<Button>` component, not raw `<button>` with utilities
- [ ] Form inputs use `.form-input`, `.form-select`, `.form-textarea`, `.form-checkbox`, `.form-label`
- [ ] Badges use the `<Badge>` component with the correct variant
- [ ] Icon-only buttons include `aria-label`
- [ ] Empty state uses the standard pattern (§4.6)
- [ ] Loading state mirrors the real layout structure with `bg-white/10` skeleton blocks

### Motion

- [ ] Page entry uses `staggerContainer` + `fadeInUp` from `@/lib/animations`
- [ ] Interactive cards lift on hover (`whileHover={{ y: -4 }}`)
- [ ] Reveal panels use the `.grid-expand-open / closed` CSS-grid pattern (no `display: none`)
- [ ] No custom keyframes outside `tailwind.config.ts`

### Mobile

- [ ] Touch targets ≥ 44 × 44 px
- [ ] Layout starts mobile-first (no `flex-row` without `md:` prefix)
- [ ] Sticky bottom action bar on mobile detail pages where appropriate

### Accessibility

- [ ] Focus ring visible on every interactive element
- [ ] Modals trap focus and close on Esc
- [ ] Form inputs paired with `<label htmlFor>`
- [ ] Status badges include `<span className="sr-only">Status: </span>` context
- [ ] Errors use `role="alert"`; live regions use `aria-live="polite"`
- [ ] Animations gated by `prefers-reduced-motion`

---

## 12. Migration notes

This design system was adopted on **2026-04-27** (derived from the WEBChecker visual language). The existing implemented pages predate this system and use a light/admin aesthetic. They must be migrated.

### Known non-conformant pages

| Surface | Files | Migration effort |
| --- | --- | --- |
| AppShell | `src/components/app/AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `BottomNav.tsx`, `MobileDrawer.tsx` | High — global navigation chrome, all uses light slate palette |
| Dashboard | `src/app/(app)/dashboard/page.tsx` | Low — placeholder, easy rebuild as glass metric cards |
| Map | `src/components/app/map/*` | Medium — detail bars, bottom sheet, placement modal |
| Settings → Asset Types | `src/app/(app)/settings/asset-types/AssetTypePanel.tsx` | Medium — table, inline form, archive section |
| Assets register | `src/app/(app)/assets/AssetRegisterPanel.tsx` and detail page | Medium — table + filters + form panel |
| Documents vault | `src/app/(app)/documents/DocumentVaultPanel.tsx` and detail page | Medium — table + filters + preview |
| Document Upload modal | `src/components/app/documents/DocumentUploadModal.tsx` | Low — modal restyle |

### Migration order

The recommendation is to migrate in this order so the user sees consistent changes pages-at-a-time, not piecemeal:

1. **Foundations** — replace `globals.css` and `tailwind.config.ts` with the references in §9 and §10. This will visually break every page but is the prerequisite for everything else.
2. **Shared components** — create `src/components/ui/{button,card,input,label,badge,skeleton}.tsx` mirroring the WEBChecker structure.
3. **AppShell** — restyle the chrome (sidebar, topbar, bottom nav, drawer).
4. **Dashboard** — rebuild as glass metric cards.
5. **Page-by-page** — Asset Types, Assets, Documents, Map detail panels.
6. **Animation layer** — add `framer-motion` and `src/lib/animations.ts` with `staggerContainer` / `fadeInUp` variants. Sweep through pages adding entry transitions.

A separate feature doc (`PWA_Features/design-system-migration.md`) should be created to track this work — it is itself a feature.

---

## Changelog

| Version | Date       | Change                                                                                                                                       |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| v2.0    | 2026-04-27 | Replaced light/marketing system with WEBChecker-derived dark glassmorphism. Full CSS + Tailwind config refresh. Migration plan documented. |
| v1.0    | 2026-04-21 | Initial light/admin system (deprecated).                                                                                                     |
