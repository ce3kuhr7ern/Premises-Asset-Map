# Feature: Help & Guidance

**Version:** v1.0
**Status:** Planned — Phase 1 (awaiting implementation sign-off)
**Routes:**

- `/help` — full guide index
- `/help/[slug]` — individual topic page (deep-linkable)

**Surface:** Web application — back-office PWA. Wired into every existing page via help icons, banners, and tooltips.

---

## 1. Purpose

The platform's primary users are not techy — village hall trustees, secretaries, treasurers, often in their 50s–70s. They know their hall and their compliance obligations inside out, but they need patient, plain-English guidance on how the platform itself works. They are not going to Google "how to use a PWA" or read a 30-page manual.

This feature makes help **part of the platform**, not a separate document. A user who is unsure what a button does, what a status badge means, or how to record an approval can find the answer **on the same page they're stuck on**, without leaving their flow.

It ships in three concrete forms:

- **Help icons** (small `?`) next to confusing things → click → modal explaining
- **Inline banners** at the top of each major feature page → dismissable hint with a "Don't show again" toggle stored in localStorage
- **Tooltips and `title` attributes** on icon-only buttons so a hover (desktop) or long-press (mobile) reveals a label

Plus a **proper `/help` page** for the trustee who wants to read the manual end-to-end with a cup of tea.

---

## 2. UX / UI

### 2.1 Help icon pattern

The default trigger. A small lucide `HelpCircle` in muted colour (`text-slate-400 hover:text-slate-700`) sits next to a heading, label, or button.

```tsx
<h2 className="...">Compliance items <HelpIcon topic="compliance-items" /></h2>
```

Clicking opens a centred modal with the topic content:

- **Modal header**: topic title + `[X]` close
- **Modal body**: 1–3 short sections of plain-English guidance with concrete examples
- **Modal footer**: optional "Read the full guide" link → `/help/[slug]` for deeper detail
- Esc and click-outside both close the modal
- Focus trap inside; focus returns to the trigger button on close

### 2.2 Help banner pattern

Every major page renders a guidance banner at the top — shown by default, hidden when the user has globally turned help off (see §2.7):

```
💡 The Compliance register is where you track every obligation — annual gas safe service,
insurance renewal, safeguarding policy review. Each item flows through stages
from "pending" to "completed". Tap "Add Item" to start.

[Read the full guide →]   [Hide help guides]
```

- "Read the full guide" links to `/help/[slug]`
- "Hide help guides" sets a single global `localStorage` flag — see §2.7 — that hides all banners and help icons site-wide for this user
- Banner uses the standard amber info colour (`bg-amber-50 border-amber-200 text-amber-900`)
- No per-page dismiss in v1.0 — one button switches help on or off globally. Less to manage; trustees who want help see it everywhere, trustees who don't want it have one switch to flip.

### 2.3 Tooltip / title pattern

For icon-only buttons (Edit, Archive, Delete, etc.), every button gains:

```tsx
<button title="Edit this asset" aria-label="Edit this asset">
```

The `title` gives a free browser-native tooltip on hover (desktop) and long-press (mobile). Screen readers already use `aria-label`. No custom tooltip component needed for v1.0; could upgrade to a styled tooltip later.

### 2.7 Global help-mode toggle

A single per-user setting controls whether banners and `<HelpIcon>` elements are visible:

- Stored in `localStorage` under key `help-mode` with values `'shown'` (default) or `'hidden'`
- A `useHelpMode()` hook returns `{ mode, setMode }` and handles SSR safely (returns `'shown'` on the server, hydrates from localStorage on the client)
- When `mode === 'hidden'`:
  - All banners render `null`
  - All `<HelpIcon>` elements render `null`
  - **`title` attributes on icon-only buttons remain** — they're browser-native and harmless
  - **`/help` and `/help/[slug]` pages remain accessible** — the user can still find the guide if they want it

**Where the toggle is exposed:**

- Each banner's `[Hide help guides]` button → sets to `'hidden'`
- Top of `/help` index page → a clearly-labelled toggle showing current state, lets the user flip back to `'shown'`

This keeps the UI clean: one switch, two clear places to find it.

### 2.4 `/help` index page

A single-column page listing every topic, grouped by feature area:

```
GETTING STARTED
  Signing in for the first time
  The dashboard at a glance

THE MAP
  Viewing the floor plan
  Placing a new asset
  Showing and hiding layers

ASSETS
  Adding an asset
  Editing or archiving an asset
  What's the difference between archive and delete?

DOCUMENTS
  Uploading a document
  How AI auto-fill works
  Why some documents have an expiry date

COMPLIANCE
  Understanding the lifecycle
  Recording an approval (in person, email, or WhatsApp)
  When to use Schedule vs Mark complete

SUPPLIERS
  Adding a supplier
  Linking suppliers to compliance items
  What happens when I archive a supplier?

THE SECRETARY'S WORKFLOW
  A typical month
  Preparing for the next trustees meeting
```

Each link goes to `/help/[slug]` — same content as the modal, longer-form layout.

### 2.5 `/help/[slug]` topic page

Same content as the modal but rendered full-page with:

- Breadcrumb back to the index
- "On this page" mini-TOC for longer topics
- "Related topics" links at the bottom

### 2.6 Where help icons / banners go

A non-exhaustive list of placements for v1.0. Each is a single line of code so adding more later is cheap.

| Surface | Help icon next to | Banner shown on first visit |
|---|---|---|
| `/dashboard` | "Dashboard" h1 | Yes — orientation banner |
| `/map/[id]` | "Place Asset" button | Yes — short tip about layers + zoom |
| `/assets` | "Assets" h1; "Add Asset" button; status column header | Yes |
| `/assets/[id]` | "Identity", "Lifecycle", "Compliance" card titles | No |
| `/documents` | "Documents" h1; "Upload Document" button | Yes — incl. AI auto-fill explanation |
| `/documents/[id]` | "Linked to" label | No |
| `/compliance` | "Compliance" h1; "Add Item" button; status chip row | Yes — incl. lifecycle overview |
| `/compliance/[id]` | "Actions" panel header; "Lifecycle" header | No |
| `/suppliers` | "Suppliers" h1; "Add Supplier" button | Yes |
| `/settings/asset-types` | "Asset Types" h1 | Yes |

Compliance is the most procedurally complex area, so it gets the most help touchpoints.

---

## 3. Content structure

All content lives in TypeScript files — **not** the database — because:

- It changes rarely (versioned with the codebase)
- The build can statically optimise topic pages
- No DB query for the most-frequently-visited pages
- Translation infrastructure (future) plugs in cleanly

```typescript
// src/lib/help/topics.ts

export interface HelpTopic {
  slug: string;                 // URL slug — also used as the topic key
  title: string;                // "Recording an approval"
  category: HelpCategory;       // 'getting-started' | 'map' | 'assets' | …
  shortDescription: string;     // 1-sentence summary, shown on the index page
  body: HelpBlock[];            // ordered content blocks
  related?: string[];           // slugs of related topics
}

export type HelpBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string; level: 2 | 3 }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'tip'; text: string }
  | { type: 'callout'; tone: 'info' | 'warning'; text: string };
```

Renderer: `<HelpContent blocks={topic.body} />` walks the array and renders each block with sensible defaults. No Markdown parser, no MDX — keeps the bundle small and the security surface zero.

If we later want richer content (images, embedded videos), add new block types: `{ type: 'image'; src: string; alt: string }`, etc.

---

## 4. API

### 4.1 No server actions, no DB

All content is static. The render path is:

```
import { getTopic, listTopics } from '@/lib/help/topics';

// /help → listTopics() → group by category → render index
// /help/[slug] → getTopic(slug) → render full topic
// HelpIcon { topic="..." } → getTopic(topic) → modal renders content
```

### 4.2 `localStorage` keys

A single key controls help visibility globally per user:

```
help-mode    'shown' | 'hidden'   (default: 'shown')
```

Hook: `useHelpMode()` returns `{ mode: 'shown' | 'hidden'; setMode: (m) => void }`. Handles SSR by returning `'shown'` during the server render and re-checking on hydration. The brief flash on first paint (if user has set `'hidden'`) is acceptable for a low-frequency state change.

---

## 5. Database

**None.** This feature touches no database tables.

---

## 6. Validation

**None server-side.** All content is hardcoded TypeScript and validated at build time by the type checker.

If we later add any user input to help (e.g. "was this helpful?" feedback), validation comes with that scope.

---

## 7. Error handling

- `/help/[slug]` with unknown slug → Next.js `notFound()` → friendly "Topic not found, here's the index" page with link back to `/help`
- `<HelpIcon topic="missing-topic" />` → in development, log a console warning naming the missing topic; in production, render the icon but disable the click (graceful degrade)
- Hydration safety on banners: server returns `dismissed: false` always, client re-checks; the banner may briefly flash on first load if user has already dismissed — acceptable for a one-time-per-page UX

---

## 8. Accessibility

This feature is itself an accessibility win, but the implementation must also be accessible:

- Help icons are real `<button>`s with `aria-label="Help: <topic title>"`
- Modal uses standard focus-trap + Esc-to-close behaviour (matches existing modals)
- Banner is a `<section role="region" aria-label="Page guidance">` with the dismiss button labelled `aria-label="Dismiss this guidance"`
- All `title` attributes on icon-only buttons should match their `aria-label` (no contradictions)
- Tooltips on touch devices are revealed via long-press by the browser — no extra work
- Topic content uses semantic HTML: `<h2>`, `<h3>`, `<ul>`, `<ol>`, `<p>` — never plain `<div>` for structural elements
- Reading order on `/help/[slug]` is logical: title → short description → TOC → body → related
- Mobile touch targets ≥ 44 × 44px (the help icon hit area is enlarged with a transparent padding box even though the visual icon is only 14px)

---

## 9. Security

- No user input → no input validation surface
- No DB access → no tenancy concerns
- Topic content is org-agnostic — same guide for every trust
- `localStorage` keys are per-browser-per-user — no cross-user leakage

---

## 10. Performance

- Topic content is bundled with the JS that imports it. v1.0 estimate: ~10–15 topics × 2KB each ≈ 30KB total — negligible.
- `/help` and `/help/[slug]` render server-side with no DB query; cached at the edge by Next.js.
- HelpIcon imports its modal lazily via `React.lazy` so the modal code only loads when the user actually opens one. Saves ~5KB on the critical path.
- Banner state lives in `localStorage`, no network request.

---

## 11. Testing

### 11.1 Required tests

- Every `<HelpIcon topic="..." />` references a real topic slug — guard via TypeScript: `topic` prop typed as union of all known slugs (compile-time validation)
- `getTopic(slug)` returns null for unknown slug; `listTopics()` returns categories in stable order
- `useHelpBanner` returns `dismissed: false` on server, hydrates from localStorage on client
- `/help/unknown-slug` returns 404
- All topic content has at least one paragraph and ends with a related-topics array (lint rule or runtime check)

### 11.2 Manual verification

- Open `/compliance` → banner appears at top with help text + "Read the full guide" link + "Hide help guides" button
- Click "Hide help guides" → banner vanishes; navigate to `/assets` → that banner is also hidden; help icons across the app are also hidden
- Visit `/help` → toggle at top shows "Help guides are hidden — [Show them again]" → click → all banners and icons return
- Click any HelpIcon → modal opens with relevant content; Esc closes it; focus returns to the icon
- `/help` index lists all categories and topics
- `/help/recording-an-approval` deep-link renders correctly
- Hover icon-only buttons (Edit, Archive, etc.) on desktop → browser tooltip appears regardless of help-mode
- Long-press the same buttons on iOS Safari → tooltip appears
- Set help to hidden, then sign out and sign in as a different user (in another browser) → that user still sees help shown by default (per-browser storage)

---

## 12. Tone of voice

The content itself is the heart of this feature. Five rules:

1. **Use the trustee's vocabulary, not ours.** "Compliance item" not "obligation entity". "Supplier" not "contractor record".
2. **Concrete over abstract.** Bad: "This dropdown allows you to select a category." Good: "Pick the closest match — for the boiler service, choose Gas Safe."
3. **Lead with the most common case.** The 80%-of-the-time path comes first. Edge cases get a "If you also need to…" later.
4. **Active voice, second person.** "You'll see…" not "The user will see…"
5. **No jargon.** No "tenant", "RBAC", "FK", "soft-delete". Say "trust", "permission", "linked", "archive".

Every topic should be written so a 70-year-old trustee can read it once and say *"oh, that's straightforward"*.

---

## 13. Pre-implementation blockers

1. **Topic content is the bulk of the work.** ~10–15 topics × ~150 words each = ~2,000 words of plain-English drafting. v1.0 ships with the topics in the inventory at §2.6 — cover the surfaces that exist; new features add their own topic when they ship.
2. **Banner copy needs to mention features that exist now.** Don't reference Notifications or Communications in v1.0 banners (those features don't exist yet). Sweep when those land.
3. **First-visit banners on existing pages will fire for the existing dev user.** That's fine — gives me a chance to verify they look right.
4. **Spec lock on tone.** §12 sets the tone. v1.0 content should be reviewed against those five rules before merging.

---

## 14. Out of scope (future enhancements)

- **Trust-admin-editable content** — DB-backed topics that admins can override per-org. Not v1.0; would require a CMS-lite UI.
- **Onboarding tour** (driver.js / shepherd.js style) — guided multi-step walkthrough on first sign-in. Different shape from help; a v2.0 feature.
- **Embedded videos** — record short screen-captures showing common workflows. Adds a `{ type: 'video' }` block type when needed.
- **In-app feedback** ("was this helpful?" thumbs up/down). Adds analytics surface to track which topics actually get used. v1.x enhancement.
- **Translations / multi-language** — copy lives in TypeScript so wrapping in `t('key')` is straightforward when needed.
- **Search across help** — for v1.0, the index page is short enough to scan. When topics grow past ~30, add a client-side fuzzy search input.
- **Printable PDF of the full guide** — a "Download as PDF" button on `/help` that renders all topics into one document. Useful for trustees who want a paper copy.

---

## Changelog

| Version | Date       | Change |
|---------|------------|--------|
| v1.0    | 2026-04-28 | Initial spec — `<HelpIcon>` + modal pattern, dismissable first-visit banners, `title` attributes on icon buttons, `/help` index + `/help/[slug]` deep-linkable topic pages. Static TypeScript content, no DB. ~10–15 topics covering Dashboard, Map, Assets, Asset Types, Documents, Compliance, Suppliers, plus a Secretary's Workflow guide. |
