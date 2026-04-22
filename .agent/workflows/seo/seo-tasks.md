---
description: SEO task prompts and operational workflows for public-facing pages
---
# SEO Tasks

This document defines operational SEO workflows. Every task follows a **human-in-the-loop** model — AI or automated tools produce drafts for team review before publishing.

---

## Task 1: Metadata Review for a New Page

**Goal:** Verify that a new public page has correct, optimised metadata before it goes live.

**Prompt:**

```text
Review the metadata for the following page: [page path or URL]

Check against SEO standards:
1. Title — 50-60 characters, includes primary topic and site name
2. Description — 150-160 characters, descriptive and unique
3. Open Graph tags — title, description, and URL present
4. Canonical tag — correct URL, no trailing slash issues
5. noindex — confirm it is NOT set (this is a public page)

Provide:
- Current value for each item above
- Pass / Fail status
- Specific fix if failing
```

---

## Task 2: On-Page SEO Audit

**Goal:** Audit an existing public page for metadata, heading hierarchy, structured data, and linking issues.

**Prompt:**

```text
Audit the following page: [URL or file path]

Check against:
1. Title and meta description (length and descriptiveness)
2. H1 presence — one per page, contains primary keyword/topic
3. Heading hierarchy — no skipped levels
4. Structured data (JSON-LD) — present, valid, zero warnings
5. Internal linking — at least one contextual link to a related page
6. Image alt text — all content images have descriptive alt

Provide for each issue:
- Issue description
- Severity: High / Medium / Low
- Specific recommended fix
```

---

## Task 3: Metadata Generation for a Detail Page

**Goal:** Draft optimised title and description for a dynamic detail page.

**Prompt:**

```text
Generate SEO metadata for a detail page with the following content:

- Page type: [e.g. premise detail, inspection report, asset profile]
- Primary subject: [name/title of the record]
- Key details to surface: [e.g. location, type, status]
- Site name: [project/product name]

Return:
- Title (50-60 chars)
- Meta description (150-160 chars)
- Suggested Open Graph description (can be slightly longer)
```

---

## Task 4: Sitemap Review

**Goal:** Verify the sitemap is complete and does not expose private or admin URLs.

**Prompt:**

```text
Review the sitemap at [/sitemap.xml or file path].

Check:
1. All public pages are included
2. No /admin, /api, or authenticated routes are present
3. URLs are canonical (no trailing slashes, no query strings unless intentional)
4. lastmod dates are present and accurate
5. Priority values are meaningful (homepage highest, detail pages lower)

List any missing pages, any pages that should be excluded, and any format issues.
```

---

## Task 5: robots.txt Review

**Goal:** Ensure the robots.txt correctly blocks non-public paths.

**Prompt:**

```text
Review the robots.txt at [/robots.txt or file path].

Check:
1. /admin paths are disallowed
2. /api paths are disallowed
3. Authentication callback paths are disallowed
4. Sitemap URL is declared
5. No public content paths are accidentally blocked

List any missing disallow rules or any rules that incorrectly block public content.
```

---

## Task 6: Core Web Vitals Review

**Goal:** Identify performance issues affecting SEO rankings before launch.

**Prompt:**

```text
Run a Core Web Vitals assessment for: [URL]

Focus on:
- LCP (Largest Contentful Paint) — target under 2.5s
- CLS (Cumulative Layout Shift) — target under 0.1
- INP (Interaction to Next Paint) — target under 200ms

For each metric that fails the target:
- Identify the likely cause
- Suggest a specific fix referencing the relevant component or asset
```

---

Last updated: April 2026
