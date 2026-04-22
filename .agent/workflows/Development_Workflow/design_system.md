# Design System & UI Standards

> **This is the single source of truth.** Every new page, component, or feature MUST reference and comply with this document before implementation. Non-compliance creates visual inconsistency and degrades user trust.

---

## 0. Quick-Reference Checklist

Before shipping any page, verify all of the following:

- [ ] Hero uses the **standard dark hero pattern** (see §3)
- [ ] H1 uses the **exact canonical class string** (see §2.1)
- [ ] H1 accent `<span>` uses `text-indigo-400` on dark backgrounds
- [ ] Background images use `<Image fill>` inside `opacity-30` wrapper — **never** CSS `bg-[url(...)]`
- [ ] **No** `mix-blend-multiply` or `mix-blend-overlay` anywhere
- [ ] **No** `font-black` on headings — always `font-bold`
- [ ] Body prose uses `.article-prose` not `prose prose-slate` or `prose prose-blue`
- [ ] Cards use `bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
- [ ] Primary CTA buttons follow the correct dark/light mode variant (see §5)
- [ ] All forms use `.form-input`, `.form-select`, `.form-checkbox`, `.form-label` classes
- [ ] Page wrapper uses `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- [ ] JSON-LD schema block present for all public pages (see §9)

---

## 1. Persuasion Architecture (Cialdini)

Every public-facing page must map to one or more of these principles. Build them into the layout — do not bolt them on afterwards.

| Principle        | Implementation Pattern                                                              |
| :--------------- | :---------------------------------------------------------------------------------- |
| **Reciprocity**  | Offer value before asking — free demo, sample report, or guide before sign-up       |
| **Scarcity**     | Surface genuine urgency — overdue inspection counts, compliance deadlines           |
| **Authority**    | Customer count, certifications, compliance badges, data visualisations              |
| **Commitment**   | Onboarding wizard — low-friction first step that deepens engagement naturally       |
| **Liking**       | Customer success contact visible on upgrade and onboarding pages                    |
| **Social Proof** | Testimonials and logos near CTAs; case study callouts near upgrade prompts          |

---

## 2. Typography

### 2.1 H1 — Page Title (canonical class string)

**This exact string must be used on every H1 across all public pages. Do not deviate.**

```tsx
<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif leading-tight">
    Main Title Line
    <span className="block text-indigo-400">Accent Line</span>
</h1>
```

Rules:

- Responsive scale: `text-4xl` → `text-5xl` → `text-6xl` (never start at `text-3xl`, never use `font-black`)
- `font-bold` only — `font-black` is banned on headings
- `font-serif` always
- `leading-tight` always
- On dark hero backgrounds: title text is white (inherited), accent span uses `text-indigo-400`
- On light backgrounds: title text is `text-slate-900`, no accent span needed
- `drop-shadow-lg` may be added when the H1 sits directly on a photographic background

### 2.2 H2 — Section Headings

```tsx
{/* On dark background */}
<h2 className="text-3xl md:text-4xl font-bold font-serif text-white leading-tight">

{/* On light background */}
<h2 className="text-3xl font-bold font-serif text-slate-900">
```

### 2.3 H3 — Card / Sub-section Headings

```tsx
<h3 className="text-xl font-bold font-serif text-slate-900">
```

### 2.4 Body Prose (rich text content)

**NEVER** use `prose prose-slate`, `prose prose-blue`, or any generic Tailwind Typography variant.
**ALWAYS** use the custom `.article-prose` class defined in `globals.css`.

```tsx
<div
    className="article-prose max-w-none"
    dangerouslySetInnerHTML={{ __html: content }}
/>
```

### 2.5 Form Labels

```tsx
<label className="form-label">Field Name</label>
{/* Resolves to: text-sm font-bold text-slate-900 uppercase tracking-wide */}
```

### 2.6 Overline / Eyebrow Text (above H1)

```tsx
<span className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-4 block">
    Section Context
</span>
```

---

## 3. Hero Banner Pattern

### 3.1 Standard Dark Hero (required on all public top-level pages)

```tsx
<section className="relative bg-slate-900 text-white overflow-hidden py-24 md:py-32">
    {/* Background image layer — opacity-30, never higher */}
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-30">
            <Image
                src="/images/your-image.jpg"
                alt=""
                fill
                className="object-cover"
                priority
            />
        </div>
    </div>

    {/* Content — always z-10 relative */}
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <span className="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-4 block">
            Eyebrow / Context
        </span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif leading-tight">
            Main Title
            <span className="block text-indigo-400">Accent Line</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-3xl">
            Supporting subtitle copy.
        </p>
    </div>
</section>
```

**Non-negotiable rules:**

- Background image opacity: **exactly `opacity-30`** — never `opacity-20` or `opacity-40`
- **NEVER** use `bg-[url(...)]` CSS background images — always `<Image fill>`
- **NEVER** use `mix-blend-multiply` or `mix-blend-overlay`
- Always `pointer-events-none` on the image wrapper
- Content wrapper always `relative z-10`
- `py-24 md:py-32` is the standard vertical rhythm

### 3.2 Hero with Stats Row

When displaying key attributes in the hero, use the Stats Grid pattern — not icon rows:

```tsx
<div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl">
    <div>
        <p className="text-xl md:text-2xl lg:text-3xl font-bold text-white font-serif">{value}</p>
        <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" /> Label
        </p>
    </div>
</div>
```

### 3.3 Hero without Background Image

When no image is available (internal tool pages, admin-adjacent views):

```tsx
<div className="bg-slate-900 py-24 md:py-32 px-4">
    <div className="max-w-7xl mx-auto">
        {/* same content structure as above */}
    </div>
</div>
```

---

## 4. Colour Palette

| Token            | Tailwind value               | Usage                               |
| :--------------- | :--------------------------- | :---------------------------------- |
| Core dark        | `slate-900` / `slate-950`    | Hero banners, footer, dark sections |
| Trust accent     | `indigo-600`                 | Primary CTAs, active links, buttons |
| Accent highlight | `indigo-400`                 | H1 accent spans, icon tints         |
| Page body        | `slate-50`                   | Main content background             |
| Card background  | `white`                      | All card components                 |
| Card border      | `border-slate-200`           | All card components                 |
| Prose text       | `slate-900`                  | Body copy on light backgrounds      |
| Muted text       | `slate-500`                  | Meta, captions, supporting copy     |
| Success          | `emerald-50` / `emerald-700` | Active/published status badges      |
| Warning          | `amber-50` / `amber-700`     | Overdue/at-risk status badges       |
| Danger           | `red-50` / `red-700`         | Critical status, destructive action |

---

## 5. Buttons & CTAs

### 5.1 Primary Action (on dark background)

```tsx
<button className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-indigo-700 transition shadow-xl shadow-indigo-900/20">
    Action Label
</button>
```

### 5.2 Primary Action (on light background)

```tsx
<button className="bg-slate-900 hover:bg-indigo-600 text-white font-bold px-6 py-3 rounded-lg shadow-md transition-all duration-300 transform hover:-translate-y-0.5">
    Action Label
</button>
```

### 5.3 Secondary / Ghost Action

```tsx
<button className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-6 py-3 rounded-lg font-medium transition-colors">
    Secondary Action
</button>
```

### 5.4 Ghost on Dark (e.g. hero second CTA)

```tsx
<button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-lg font-bold hover:bg-white/20 transition">
    Secondary Action
</button>
```

### 5.5 Danger / Destructive Action

```tsx
<button className="text-red-600 hover:text-red-700 font-medium transition-colors">
    Delete
</button>
{/* Use a full red button only when confirming a destructive action in a modal */}
<button className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg">
    Confirm Delete
</button>
```

### 5.6 Trust Signal beneath Forms

```tsx
<p className="text-center text-xs text-emerald-600 mt-2">
    🔒 Your data is encrypted and never shared without consent
</p>
```

---

## 6. Cards

### 6.1 Standard Content Card

```tsx
<div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
    {/* image area */}
    {/* content area */}
</div>
```

### 6.2 Card Image Hover

Images inside cards should scale subtly on group hover:

```tsx
<Image className="object-cover transition-transform duration-500 group-hover:scale-105" />
```

### 6.3 Record / List Item Card

```tsx
<Link className="block bg-white rounded-2xl border border-slate-200 p-7 hover:border-indigo-300 hover:shadow-md transition-all group">
    <h2 className="text-xl font-bold font-serif text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
        {title}
    </h2>
    {/* meta row */}
</Link>
```

### 6.4 Stat / Summary Card

```tsx
<div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
    <p className="text-3xl font-bold font-serif text-slate-900">{value}</p>
    <p className="text-sm text-slate-500 mt-1 uppercase tracking-wide font-semibold">{label}</p>
</div>
```

---

## 7. Layout

### 7.1 Standard Page Wrapper

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

This wrapper is used on every section that contains text or card content. Never exceed `max-w-7xl` for public pages.

### 7.2 Two-Column (Content + Sidebar)

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
    <div className="lg:col-span-2">
        {/* Main content */}
    </div>
    <div className="lg:col-span-1">
        <div className="sticky top-28">
            {/* Sidebar / action panel */}
        </div>
    </div>
</div>
```

Sidebars containing primary actions must be `sticky top-28` on desktop.

### 7.3 Grid Density

| Context                 | Columns                                     |
| :---------------------- | :------------------------------------------ |
| Summary / stat cards    | `grid-cols-2 md:grid-cols-4`                |
| Feature / content cards | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| Team / people grid      | `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` |
| Stats row in hero       | `grid-cols-2 md:grid-cols-4`                |

---

## 8. Forms

### 8.1 CSS Utility Classes (defined in `globals.css`)

Always use these base classes — do not pile raw Tailwind utilities directly on form elements:

| Class            | Element                         | Key Properties                                                                 |
| :--------------- | :------------------------------ | :----------------------------------------------------------------------------- |
| `.form-input`    | `<input type="text/email/tel">` | `px-4 py-3 border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500` |
| `.form-select`   | `<select>`                      | Matches `.form-input` height; `appearance-none`; custom chevron                |
| `.form-checkbox` | `<input type="checkbox">`       | `w-5 h-5 border-slate-300`; `:checked → bg-indigo-600` with white tick         |
| `.form-label`    | `<label>`                       | `text-sm font-bold text-slate-900 uppercase tracking-wide`                     |

### 8.2 Icon in Input

```tsx
<div className="relative flex-1">
    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
    <input type="text" className="form-input !pl-12" />
</div>
```

Minimum `pl-12` when an icon is present.

### 8.3 Unified Pill Search Container

For the primary search bar, never use separate bordered inputs. Use the unified pill:

```tsx
<form className="bg-white p-2 md:p-3 rounded-xl shadow-xl flex flex-col md:flex-row gap-2">
    <div className="flex-1 flex items-center px-4">
        <Icon className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
        <input className="w-full bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400" />
    </div>
    <div className="flex-1 flex items-center px-4 md:border-l border-slate-200">
        <Icon className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
        <input className="w-full bg-transparent border-none focus:outline-none text-slate-900 placeholder:text-slate-400" />
    </div>
    <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition flex-shrink-0">
        Search
    </button>
</form>
```

### 8.4 Expand/Collapse Animation

Never snap elements into view. Use CSS grid height transition:

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

---

## 9. SEO Standards (Public Pages Only)

### 9.1 Metadata

```tsx
export const metadata: Metadata = {
    title: 'Page Title | [Site Name]',   // 50-60 chars
    description: '...',                  // 150-160 chars
    openGraph: {
        title: '...',
        description: '...',
        url: 'https://your-domain.com/path',
    },
    alternates: {
        canonical: 'https://your-domain.com/path',
    },
};
```

Rules:

- Canonical URL always set to prevent duplicate content penalties
- `openGraph.url` always matches canonical
- Admin and authenticated routes must carry `robots: { index: false }`

### 9.2 JSON-LD Schema

Embed structured data as a `<script>` tag in the page component. See `seo-standards.md` for full schema guidance per page type.

```tsx
<script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
/>
```

---

## 10. Mobile Patterns

### 10.1 Stack Order on Mobile

- Always `flex-col` first, never `flex-row` without a `md:` prefix
- Sidebar / action panel falls below main content on mobile (natural document order)
- Primary actions on detail pages should become a fixed bottom panel on mobile:

```tsx
<div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 md:relative md:shadow-none md:border-t-0">
    <button className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">
        Primary Action
    </button>
</div>
```

### 10.2 Touch Targets

- All interactive elements minimum `44×44px`
- Input fields: `py-3` minimum padding
- Buttons: `py-3 px-6` minimum

### 10.3 Typography on Mobile

- Never `text-justify`
- Avoid deeply indented sub-lists
- No horizontally scrolling tables — use responsive card layouts instead

---

## 11. Admin Dashboard Patterns

Internal routes follow a stripped-back aesthetic — clean and functional, distinct from public pages.

- **Canvas background:** `bg-slate-50`
- **Panels:** `bg-white rounded-xl border border-slate-200 shadow-sm`
- **Headings:** Clean sans-serif, `text-slate-900`, no oversized serifs
- **Primary button:** `bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-md`
- **Secondary button:** `bg-white border border-slate-200 text-slate-700 hover:bg-slate-50`
- **Danger button:** `text-red-600 hover:text-red-700` (text-only unless confirming a destructive action)
- **Status badge — active/published:** `bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full`
- **Status badge — draft/pending:** `bg-slate-100 text-slate-500 text-xs font-semibold px-2.5 py-0.5 rounded-full`
- **Status badge — overdue/critical:** `bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-0.5 rounded-full`

---

## 12. Naming Conventions

### 12.1 File Naming

| Pattern           | Convention                                     |
| :---------------- | :--------------------------------------------- |
| Pages             | `src/app/[route]/page.tsx`                     |
| Client components | `kebab-case.tsx` (e.g. `asset-card.tsx`)       |
| Server actions    | `src/app/actions/[domain].ts`                  |
| Utilities         | `src/lib/[name].ts`                            |
| Schema helpers    | `src/lib/schema.ts`                            |

### 12.2 CSS Class Naming

| Prefix / Name    | Scope                                          |
| :--------------- | :--------------------------------------------- |
| `.form-*`        | Form utility classes defined in `globals.css`  |
| `.article-prose` | Rich-text / generated content rendering        |
| No custom class  | Utility-first Tailwind for all other elements  |

### 12.3 Component Props

- Boolean props: `isPublished`, `hasImage`, `showSidebar` (never `published`, `image`, `sidebar`)
- Handler props: `onSubmit`, `onChange`, `onClose` (never `submit`, `change`, `close`)
- Data props: named after the entity — `premise`, `asset`, `inspection` (not `data`, `item`, `record`)
