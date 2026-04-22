---
description: Frontend and UI standards — design system enforcement, component patterns, forms, layout, and mobile
---
# Frontend Design Standards

Read this at **Phase 2 (Write the Code)** for every task involving UI, components, CSS, or layout. Read `DESIGN_SYSTEM.md` first — this document tells you how to apply it.

---

## 1. Before Writing Any UI Code

Before writing any CSS class or React component, read `DESIGN_SYSTEM.md` in the project root. It defines the visual language the app must follow — colours, typography, spacing, card patterns, button variants, and form components.

The checklist in `DESIGN_SYSTEM.md §0` must pass for every page before it ships.

---

## 2. Typography

### Rules (DESIGN_SYSTEM.md §2)

Every page must have exactly one `<h1>`. Use the canonical class string — do not deviate:

```tsx
<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif leading-tight">
  Main Title
  <span className="block text-indigo-400">Accent Line</span>
</h1>
```

- `font-bold` only — `font-black` is banned on headings
- `font-serif` always on headings (`h1`, `h2`, `h3`)
- On light backgrounds: `text-slate-900`, no accent span needed
- On dark hero backgrounds: white inherited, accent span uses `text-indigo-400`

### Body prose

Never use `prose prose-slate` or `prose prose-blue`. Always use the `.article-prose` class from `globals.css`:

```tsx
<div className="article-prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
```

### Eyebrow / overline text

Used above `<h1>` to provide page context:

```tsx
<span className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-4 block">
  Section Context
</span>
```

---

## 3. Hero Banners (DESIGN_SYSTEM.md §3)

All public top-level pages use the standard dark hero. Key non-negotiable rules:

- Background image uses `<Image fill>` inside an `opacity-30` wrapper — **never** `bg-[url(...)]`
- Opacity is **exactly** `opacity-30` — not `opacity-20`, not `opacity-40`
- **Never** `mix-blend-multiply` or `mix-blend-overlay`
- Image wrapper always has `pointer-events-none`
- Content wrapper always `relative z-10`
- Standard vertical rhythm: `py-24 md:py-32`

```tsx
<section className="relative bg-slate-900 text-white overflow-hidden py-24 md:py-32">
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 opacity-30">
      <Image src="/images/hero.jpg" alt="" fill className="object-cover" priority />
    </div>
  </div>
  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* content */}
  </div>
</section>
```

When no background image is available (internal or admin-adjacent pages), use `bg-slate-900` alone without the image wrapper.

---

## 4. Colour Usage (DESIGN_SYSTEM.md §4)

| Colour role      | Tailwind class          | Do                                           | Don't                            |
|------------------|-------------------------|----------------------------------------------|----------------------------------|
| Core dark        | `slate-900`             | Heroes, footer, dark section backgrounds     | Use on body text                 |
| Primary action   | `indigo-600`            | CTA buttons, active nav, focus rings         | Use for decoration               |
| Accent           | `indigo-400`            | H1 accent spans, icon tints on dark bg       | Use on light backgrounds as text |
| Body background  | `slate-50`              | Page canvas                                  | Use inside cards                 |
| Cards            | `white` + `slate-200`   | All card surfaces and borders                | Use raw white without a border   |
| Success status   | `emerald-50`/`700`      | Active, published, compliant badges          | Use for positive body text       |
| Warning status   | `amber-50`/`700`        | Overdue, at-risk badges                      | Use as a primary brand colour    |
| Danger status    | `red-50`/`700`          | Critical alerts, destructive actions         | Use for emphasis only            |

Never introduce colours outside this palette without updating `DESIGN_SYSTEM.md` first.

---

## 5. Buttons (DESIGN_SYSTEM.md §5)

Choose the correct variant — never create ad-hoc button styles:

```tsx
{/* Primary — on dark background */}
<button className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-indigo-700 transition shadow-xl shadow-indigo-900/20">
  Action
</button>

{/* Primary — on light background */}
<button className="bg-slate-900 hover:bg-indigo-600 text-white font-bold px-6 py-3 rounded-lg shadow-md transition-all duration-300 transform hover:-translate-y-0.5">
  Action
</button>

{/* Secondary / ghost */}
<button className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-6 py-3 rounded-lg font-medium transition-colors">
  Secondary
</button>

{/* Danger — text only unless confirming destructive action */}
<button className="text-red-600 hover:text-red-700 font-medium transition-colors">
  Delete
</button>
```

Minimum touch targets: `py-3 px-6`. Never go below this on any interactive element.

---

## 6. Cards (DESIGN_SYSTEM.md §6)

Standard card:

```tsx
<div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
```

Rules:

- All cards: `bg-white`, `border border-slate-200` — never raw white without border
- Card images scale on hover via `group-hover:scale-105 transition-transform duration-500`
- Clickable cards: use `<Link>` wrapping the entire card, with `hover:border-indigo-300` on hover
- Stat/summary cards: `bg-white rounded-xl border border-slate-200 p-6 shadow-sm`

---

## 7. Layout (DESIGN_SYSTEM.md §7)

### Page wrapper

Every section containing text or card content must use:

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

Never exceed `max-w-7xl` on public pages.

### Grid density

Use the correct grid columns for each content type — see `DESIGN_SYSTEM.md §7.3`. Do not invent custom grid configurations without justification.

### Two-column layout

Sidebars containing primary actions must be `sticky top-28` on desktop. The sidebar always falls below main content on mobile (natural document order — no reordering via CSS).

---

## 8. Forms (DESIGN_SYSTEM.md §8)

### Use project CSS utility classes

All form elements must use the classes defined in `globals.css`. Never pile raw Tailwind utilities on inputs, selects, or labels:

| Element                   | Class            |
|---------------------------|------------------|
| Text / email / tel inputs | `.form-input`    |
| Select dropdowns          | `.form-select`   |
| Checkboxes                | `.form-checkbox` |
| Labels                    | `.form-label`    |

Default browser styles for form elements are strictly prohibited.

### Icon inputs

When an icon sits inside an input field, use `!pl-12` to prevent text overlapping the icon:

```tsx
<div className="relative flex-1">
  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
  <input type="text" className="form-input !pl-12" />
</div>
```

### Unified pill search container

For the primary search bar, never use separate bordered inputs. Wrap all inputs in a single pill container:

```tsx
<form className="bg-white p-2 md:p-3 rounded-xl shadow-xl flex flex-col md:flex-row gap-2">
  <div className="flex-1 flex items-center px-4">
    <Icon className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
    <input className="w-full bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400" />
  </div>
  <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition flex-shrink-0">
    Search
  </button>
</form>
```

Use CSS Grid inside the pill when elements must never wrap or overflow on any viewport:

```tsx
<form className="bg-white p-3 rounded-xl shadow-xl grid grid-cols-[1fr_auto] gap-2">
```

---

## 9. Transitions and Reveals

### Expand/collapse pattern

Any toggled or revealing UI element (filter panel, expandable section, mobile menu) must use CSS grid height transition — not `display: none`, not sudden conditional rendering, and not JS animation libraries:

```tsx
<div
  className="grid transition-all duration-300 ease-in-out"
  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
>
  <div className="overflow-hidden">
    <div className={`transition-all duration-300 ${isOpen ? 'pt-6 border-t opacity-100' : 'pt-0 border-transparent opacity-0'}`}>
      {/* content */}
    </div>
  </div>
</div>
```

This produces smooth height animation without JavaScript measuring DOM heights.

### Card and image hover

Images inside cards scale subtly via `group-hover:scale-105`. Buttons translate slightly via `hover:-translate-y-0.5`. These are the only approved motion patterns — do not add custom keyframe animations without design review.

---

## 10. Mobile (DESIGN_SYSTEM.md §10)

- **Mobile-first:** `flex-col` first, never `flex-row` without a `md:` prefix
- **Touch targets:** All interactive elements minimum `44×44px`
- **PWA surfaces** (field inspections, asset capture): critical actions in the lower half of the screen, reachable one-handed
- **Fixed bottom panel:** Use for primary actions on detail pages on mobile:

```tsx
<div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 md:relative md:shadow-none md:border-t-0">
  <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">
    Primary Action
  </button>
</div>
```

- **No `text-justify`**, no deeply indented sub-lists, no horizontally scrolling tables — use card layouts instead for data that would overflow

---

## 11. Admin Dashboard Patterns (DESIGN_SYSTEM.md §11)

Admin routes (`/admin/*`, `/dashboard/*`) use a stripped-back aesthetic — clean and functional, distinct from public pages:

- Canvas: `bg-slate-50`; panels: `bg-white rounded-xl border border-slate-200 shadow-sm`
- Headings: clean sans-serif `text-slate-900`, no oversized serifs
- Status badges: `bg-emerald-50 text-emerald-700` (active), `bg-slate-100 text-slate-500` (draft), `bg-red-50 text-red-700` (critical)
- Do not use the serif hero pattern, overline text, or accent spans on admin pages

---

## 12. Naming Conventions (DESIGN_SYSTEM.md §12)

| What                  | Convention                                                  |
|-----------------------|-------------------------------------------------------------|
| Component files       | `kebab-case.tsx`                                            |
| Boolean props         | `isPublished`, `hasImage`, `showSidebar`                    |
| Event handler props   | `onSubmit`, `onChange`, `onClose`                           |
| Data props            | Named after the entity: `premise`, `asset`, `inspection`    |
| CSS utility classes   | `.form-*` for form elements; `.article-prose` for prose     |

---

## 13. Pre-Implementation Checklist

```text
[ ] DESIGN_SYSTEM.md §0 checklist reviewed for this page/component
[ ] H1 uses canonical class string; only one per page
[ ] All headings use font-serif and follow h1 → h2 → h3 hierarchy
[ ] Body prose uses .article-prose, not prose prose-slate
[ ] Hero uses Image fill inside opacity-30 wrapper — not bg-[url(...)]
[ ] All colours come from the design token palette
[ ] Button variant matches context (dark bg / light bg / secondary / danger)
[ ] All cards have bg-white border border-slate-200
[ ] Page content wrapped in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
[ ] Form elements use .form-input / .form-select / .form-checkbox / .form-label
[ ] No raw Tailwind utilities on form elements; no default browser form styles
[ ] Toggled/expanding UI uses CSS grid height transition
[ ] All touch targets minimum 44×44px
[ ] Mobile layout is flex-col first with md: breakpoints for row layouts
[ ] Admin pages do not use the serif hero or accent span patterns
```
