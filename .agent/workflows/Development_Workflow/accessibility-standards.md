---
description: WCAG 2.1 AA accessibility standards — applied during implementation, not as an afterthought
---
# Accessibility Standards

Accessibility is applied **during Phase 2 (Write the Code)**, not after. Retrofitting accessibility is slower and more error-prone. This checklist targets WCAG 2.1 AA — the minimum standard for any commercial web application.

---

## 1. Semantic HTML

The right element for the job is the most important accessibility decision.

```typescript
// ✅ Use semantic elements
<header>        // Top-level site header
<nav>           // Navigation blocks
<main>          // Primary page content (one per page)
<article>       // Self-contained content
<section>       // Thematic grouping within a page
<aside>         // Complementary content (sidebar)
<footer>        // Page or section footer
<h1>–<h6>      // Heading hierarchy — never skip levels

// ❌ Never use divs and spans for structural meaning
<div class="header">       // No semantic meaning for assistive tech
<span onClick={handler}>   // Not keyboard-accessible
```

**Heading hierarchy rule:** Every page must have exactly one `<h1>`. Subheadings must follow order: `h1 → h2 → h3`. Never use heading tags purely for visual styling — use a CSS class instead.

---

## 2. Images

Every `<Image>` or `<img>` element must have an `alt` attribute.

```typescript
// ✅ Descriptive alt text — answers "what is this image of?"
<Image src={photo} alt={`${member.name}, ${member.role}`} />
<Image src={buildingImage} alt="Front elevation of Centenary House" />

// ✅ Decorative images (add no meaning) use empty alt
<Image src={divider} alt="" aria-hidden="true" />

// ❌ Generic alt text provides no value
<Image src={photo} alt="image" />
<Image src={photo} alt="Company name" />
<Image src={photo} alt="background" />
```

---

## 3. Form Labels

Every form input must be associated with a label. Screen readers cannot infer labels from visual proximity.

```typescript
// ✅ Explicit label with htmlFor
<label htmlFor="asset-name" className="form-label">Asset Name</label>
<input id="asset-name" name="asset_name" type="text" className="form-input" />

// ✅ For icon-only inputs, use aria-label
<input
  type="search"
  aria-label="Search assets"
  placeholder="Asset name or reference"
/>

// ❌ Visual label with no association
<span className="form-label">Asset Name</span>
<input type="text" />  // Screen reader has no idea what this field is for
```

For groups of related inputs (radio buttons, checkboxes), wrap in `<fieldset>` with a `<legend>`:

```typescript
<fieldset>
  <legend className="form-label">Asset condition</legend>
  <label><input type="radio" name="condition" value="good" /> Good</label>
  <label><input type="radio" name="condition" value="fair" /> Fair</label>
  <label><input type="radio" name="condition" value="poor" /> Poor</label>
</fieldset>
```

---

## 4. Interactive Elements

Buttons and links have distinct semantic meanings — do not swap them.

```typescript
// ✅ Buttons for actions (no URL change)
<button onClick={openModal}>Add Inspection</button>
<button onClick={submitForm} type="submit">Save Asset</button>

// ✅ Links for navigation
<Link href="/premises">View all premises</Link>
<a href="https://..." rel="noopener noreferrer" target="_blank">
  View documentation
</a>

// ❌ Never use divs or spans as interactive elements
<div onClick={handler}>Click me</div>      // Not keyboard accessible
<span onClick={openModal}>Submit</span>    // No role, no focus, no keyboard
```

**Icon-only buttons must have an accessible name:**

```typescript
// ✅ aria-label describes what the button does
<button aria-label="Close modal" onClick={onClose}>
  <XIcon aria-hidden="true" />
</button>

// ❌ Icon button with no accessible name
<button onClick={onClose}>
  <XIcon />   // Screen reader announces "button" with no context
</button>
```

---

## 5. Keyboard Navigation

Every interactive element must be reachable and operable via keyboard alone.

- **Focus order must follow visual reading order.** Check by tabbing through every page.
- **Focus must be visible.** Never use `outline: none` without providing an equivalent custom focus indicator.
- **Modals must trap focus.** When a modal opens, focus must move inside it and cannot escape to the page behind. When closed, focus returns to the trigger element.
- **Dropdown menus and custom selects** must be keyboard-operable with arrow keys if they deviate from native `<select>`.

```typescript
// ✅ Always add visible focus styles in globals.css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
```

---

## 6. ARIA — Use Sparingly

ARIA augments HTML when native semantics are insufficient. It does not fix bad HTML.

```typescript
// ✅ Use aria-label when visible text is absent or insufficient
<nav aria-label="Main navigation">
<nav aria-label="Footer navigation">

// ✅ Use aria-current for active navigation items
<Link href="/premises" aria-current={isActive ? 'page' : undefined}>

// ✅ Use aria-expanded for collapsible sections
<button aria-expanded={isOpen} aria-controls="filter-panel">Filters</button>
<div id="filter-panel" hidden={!isOpen}>...</div>

// ✅ Use aria-live for dynamic content updates (search results, form feedback)
<div aria-live="polite" aria-atomic="true">
  {resultCount} assets found
</div>

// ❌ Do not add ARIA to override correct semantics
<button role="button">...</button>  // redundant
<h2 role="heading">...</h2>         // redundant
```

---

## 7. Colour and Contrast

- **Text contrast minimum:** 4.5:1 against its background (WCAG AA).
- **Large text (18px+ bold or 24px+ regular):** 3:1 minimum.
- **Never convey meaning through colour alone.** Error states must have an icon or text label, not just a red border.
- **Check contrast in dark mode if applicable** — Tailwind's `dark:` utilities can introduce new contrast failures.

Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify new colour combinations before implementing.

---

## 8. Pre-Implementation Checklist

```text
[ ] Page has exactly one <h1> and headings follow hierarchy
[ ] All images have descriptive alt text (or alt="" if decorative)
[ ] Every form input has an associated <label> via htmlFor
[ ] Icon-only buttons have aria-label
[ ] Links used for navigation, buttons for actions — never divs/spans
[ ] Modal/drawer traps focus and returns focus on close
[ ] No outline: none without a visible alternative focus style
[ ] Dynamic content updates announced via aria-live
[ ] Text contrast meets 4.5:1 minimum
[ ] Entire interaction flow is completable by keyboard alone
```
