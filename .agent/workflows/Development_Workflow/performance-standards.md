---
description: Performance standards for Next.js App Router — images, caching, server vs client components, and bundle size
---
# Performance Standards

Read this at **Phase 2 (Write the Code)** whenever a feature involves images, data fetching, caching, or the decision between server and client components. Poor performance decisions are easy to miss at implementation time and expensive to fix retroactively.

---

## 1. Server vs Client Components

This is the most impactful performance decision in App Router. Default to Server Components.

### Rules

- **Default to Server Components.** Data fetching, database queries, and static rendering happen server-side at zero JS cost to the browser.
- **Add `'use client'` only when the component needs:** `useState`, `useEffect`, event listeners, browser APIs, or third-party client libraries.
- **Never put data fetching inside a Client Component.** Fetch in a Server Component and pass data as props.
- **Keep Client Components small and leaf-level.** A Client Component cannot contain a Server Component as a child — pushing `'use client'` down the tree keeps the server-rendered surface large.

```typescript
// ✅ Good — fetch in server, pass to client
// app/premises/page.tsx (Server Component)
const premises = await getActivePremises();
return <PremisesList premises={premises} />;

// ❌ Bad — fetch inside client component
'use client';
export default function PremisesList() {
  const [premises, setPremises] = useState([]);
  useEffect(() => { fetch('/api/premises').then(...) }, []); // Runs on client, slow
}
```

---

## 2. Images

Every `<Image>` component from `next/image` must have these attributes set:

```typescript
<Image
  src={src}
  alt="Descriptive alt text"        // Required — never leave as generic string
  width={800}                        // Required for non-fill images
  height={600}                       // Required for non-fill images
  quality={75}                       // Default is 75; reduce to 60 for backgrounds
  sizes="(max-width: 768px) 100vw, 50vw"  // Required for responsive images
  priority={isAboveFold}             // true only for the largest above-the-fold image
/>
```

### Image rules

- **`priority={true}` on at most one image per page** — the largest above-the-fold image only. Using it on multiple images negates its benefit.
- **Never render hidden images.** If a component cycles through multiple images (e.g. a carousel), render only the current and next image — not all of them.
- **Use `fill` only inside a positioned parent.** Always pair with `className="object-cover"` or `object-contain`.
- **Source images must be under 200 KB before Next.js optimisation.** If an original file exceeds 500 KB, compress it before committing to `/public`. Use WebP format where possible.
- **Do not use `<img>` tags.** Always use `next/image`.

---

## 3. Caching and Revalidation Strategy

### Page-level `revalidate`

| Page type            | Recommended `revalidate` | Reason                                         |
|----------------------|--------------------------|------------------------------------------------|
| Dashboard / overview | `300` (5 min)            | Data changes, but real-time is not required    |
| Detail page          | `3600` (1 hour)          | Rarely changes; busted on edit                 |
| Public listing       | `300` (5 min)            | New records can appear                         |
| Reference / static   | `86400` (24 hours)       | Very low change frequency                      |
| Admin pages          | `0` (no cache)           | Always fresh                                   |

Never use `revalidate = 0` on public pages — this regenerates the page on every request and kills performance under load.

### On-demand revalidation (preferred)

When a record is created, updated, or deleted, call `revalidatePath()` in the server action so the cache is busted immediately:

```typescript
// src/app/actions/premises.ts
import { revalidatePath } from 'next/cache';

export async function updatePremise(premiseId: string) {
  await requireAuth();
  // ... update DB
  revalidatePath('/');
  revalidatePath('/premises');
  revalidatePath(`/premises/${premiseId}`);
}
```

This lets pages have long `revalidate` windows with no staleness after an edit.

---

## 4. Data Fetching Patterns

```typescript
// ✅ Fetch at the page level, pass down as props
// app/premises/page.tsx
export default async function PremisesPage() {
  const premises = await getActivePremises(); // single DB call
  return <PremisesGrid premises={premises} />;
}

// ✅ Parallel fetching for independent data
const [premises, inspections] = await Promise.all([
  getActivePremises(),
  getRecentInspections(),
]);

// ❌ Sequential fetching when parallel is possible
const premises = await getActivePremises();
const inspections = await getRecentInspections(); // waits for premises unnecessarily
```

---

## 5. JavaScript Bundle Size

- **Never import an entire library when only one function is needed.**

  ```typescript
  // ❌ Imports entire lodash
  import _ from 'lodash';

  // ✅ Tree-shaken import
  import debounce from 'lodash/debounce';
  ```

- **Audit new dependencies before adding.** Run `npm run build` and check the bundle size output. A dependency that adds more than 50 KB to a page bundle requires justification.

- **Dynamic imports for below-the-fold and modal content.**

  ```typescript
  const InspectionModal = dynamic(() => import('@/components/inspection-modal'), { ssr: false });
  ```

---

## 6. Pre-Implementation Checklist

```text
[ ] New components default to Server unless interactivity specifically required
[ ] All Image components have quality, sizes, and descriptive alt
[ ] priority={true} used on at most one image per page
[ ] Source images are under 200 KB
[ ] Page revalidate values set correctly for page type
[ ] revalidatePath() called in server actions that change published content
[ ] Parallel data fetching used where data is independent
[ ] No entire library imported when a single function is needed
```
