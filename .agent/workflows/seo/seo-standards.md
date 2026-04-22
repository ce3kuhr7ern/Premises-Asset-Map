---
description: SEO standards for public-facing pages — on-page fundamentals, structured data, and technical requirements
---
# SEO Standards

Read this at **Phase 2 (Write the Code)** for any feature that produces public-facing pages. Apply these standards during implementation — retrofitting SEO is slower and risks breaking existing rankings.

---

## 1. When SEO Applies

Not all pages need SEO attention. Apply this document to:

- **Public marketing or landing pages** — accessible without login
- **Public-facing data or content listings** — indexable by search engines
- **Detail pages with unique URLs** — each warrants its own metadata

Admin dashboards, authenticated app views, and internal tooling are **excluded** — these should carry `noindex` headers.

---

## 2. Metadata Requirements

Every public page must export a `generateMetadata` function or static `metadata` object.

```typescript
// ✅ Dynamic metadata for detail pages
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const record = await getRecordById(params.id);
  if (!record) return {};

  return {
    title: `${record.name} | Project Name`,
    description: record.summary ?? `Details for ${record.name}.`,
    openGraph: {
      title: record.name,
      description: record.summary ?? '',
      url: `https://your-domain.com/records/${record.id}`,
    },
  };
}

// ✅ Static metadata for fixed pages
export const metadata: Metadata = {
  title: 'Records | Project Name',
  description: 'Browse all active records in the system.',
};
```

### Metadata rules

- **Title:** 50–60 characters. Include the page subject and the site name.
- **Description:** 150–160 characters. Describe what the user finds on the page — not a generic tagline.
- **No duplicate titles or descriptions** across pages.
- **`noindex` on all authenticated/admin routes** — set via `next.config.ts` headers or per-page metadata.

---

## 3. Heading Hierarchy

- Every public page must have exactly one `<h1>` that contains the primary topic of the page.
- Subheadings must follow strict order: `h1 → h2 → h3`. Never skip levels.
- Never use heading tags for visual styling — use a CSS class instead.

---

## 4. URL Structure

| Rule                     | Detail                                                     |
|--------------------------|------------------------------------------------------------|
| Format                   | Lowercase, kebab-case only                                 |
| Avoid query strings      | Use path segments for filterable content where possible    |
| Descriptive slugs        | Prefer `/premises/centenary-house` over `/premises/12345`  |
| Collision handling       | Append a short unique suffix (e.g., `-2`) if slug collides |
| No trailing slashes      | Consistent canonical form — choose one and stick to it     |

---

## 5. Structured Data (Schema.org JSON-LD)

Add JSON-LD to public pages to help search engines understand the content type.

```typescript
// app/premises/[slug]/page.tsx
export default function PremisePage({ premise }: { premise: Premise }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: premise.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: premise.address,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/* page content */}
    </>
  );
}
```

Validate structured data with [Google's Rich Results Test](https://search.google.com/test/rich-results) before deploying. Target zero warnings.

---

## 6. Images

- All `<Image>` components must have descriptive `alt` text — never empty or generic for content images.
- Decorative images use `alt=""` and `aria-hidden="true"`.
- Use the `next/image` component for all images — it handles WebP conversion and lazy loading automatically.

---

## 7. Internal Linking

- Every public page should link to at least one related page.
- Use descriptive link text — never "click here" or "read more".
- Ensure the site has a crawlable nav path to every public page (no orphan pages).

---

## 8. Technical Requirements

- [ ] `sitemap.xml` generated and registered in Vercel / Google Search Console
- [ ] `robots.txt` present — disallows `/admin`, `/api`, and any authenticated paths
- [ ] Canonical `<link rel="canonical">` tag on all indexable pages
- [ ] No broken links on public pages (`npm run build` reports these)
- [ ] Core Web Vitals passing — check with Lighthouse or PageSpeed Insights before launch
- [ ] HTTP redirects in place for any renamed or removed URLs (301, not 302)

---

## 9. Pre-Implementation Checklist

```text
[ ] generateMetadata or static metadata exported from every public page
[ ] Title 50-60 chars, description 150-160 chars — no duplicates
[ ] Single <h1> with primary topic; heading hierarchy correct
[ ] URL is lowercase kebab-case with a descriptive slug
[ ] JSON-LD structured data added for appropriate content types
[ ] All content images have descriptive alt text
[ ] Admin/authenticated routes carry noindex
[ ] Internal links use descriptive anchor text
```
