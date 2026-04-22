---
description: Security checklist enforced on every feature build — must be reviewed before implementation and verified before commit
---
# Security Standards

This document is a **mandatory pre-build and pre-commit checklist** for every feature. It is invoked automatically as part of the `development-strategy.md` workflow and must be reviewed at **Phase 1 (Design the Architecture)** and signed off at **Phase 3 (Deploy)**.

No feature should be committed to production without passing all applicable checks below.

---

## 1. Authentication & Authorisation

Every feature that touches data must answer these questions before implementation:

- [ ] **Are protected routes covered by auth middleware?**
  All `/admin/*` and `/dashboard/*` routes must be covered by the auth middleware check in `src/middleware.ts`. New protected route segments must be explicitly tested against middleware.

- [ ] **Do all server actions check auth before operating?**
  Every server action must verify the session before doing any work. This applies even if the action is only linked from a protected page — server actions are callable directly.

  ```typescript
  const session = await requireAuth();
  if (!session) throw new Error('Unauthorised');
  ```

- [ ] **Do all API route handlers validate auth?**
  Any route that reads or writes sensitive data must validate the session. Public read-only routes are exempt but must return only non-sensitive fields.

- [ ] **Is the correct database client used?**
  Elevated/service-role client is required for all admin operations and server actions that write data. Public/anon client is acceptable only for public read queries on active data. Never use a public client in admin routes or server actions that write.

---

## 2. Input Validation & Injection Prevention

- [ ] **All user inputs are validated server-side before any DB write.**
  Trim whitespace, enforce length limits, check required fields. Never trust client-side validation alone — it can be bypassed.

  ```typescript
  if (!name?.trim() || name.trim().length > 200) throw new Error('Invalid name');
  ```

- [ ] **No raw string interpolation into queries.**
  Always use the ORM's parameterised query methods. Never construct SQL strings manually with user input.

- [ ] **`dangerouslySetInnerHTML` is only used with sanitised content.**
  Any HTML originating from an external source or user input must be sanitised with DOMPurify before rendering.

  ```typescript
  import DOMPurify from 'isomorphic-dompurify';
  const clean = DOMPurify.sanitize(rawHtml);
  ```

- [ ] **File uploads validate type and size on the server.**
  Accepted MIME types must be checked server-side (not just via the HTML `accept` attribute). Size limits enforced server-side (images: 5 MB max, documents: 10 MB max).

  ```typescript
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Invalid file type');
  if (file.size > 5 * 1024 * 1024) throw new Error('File too large');
  ```

- [ ] **User-supplied data is HTML-escaped before embedding in email templates.**
  Never interpolate user input raw into HTML email strings. Use an escape helper for all dynamic values.

  ```typescript
  function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!));
  }
  // Usage: `<p>Dear ${escapeHtml(fullName)},</p>`
  ```

---

## 3. API Route Security

- [ ] **Cron and webhook endpoints require a secret token.**
  Internal cron routes must validate a shared secret. The `CRON_SECRET` env var must be set in Vercel and in `.env.local`.

  ```typescript
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  ```

- [ ] **Public API routes have rate limiting.**
  Any unauthenticated endpoint must implement rate limiting. Use `cf-connecting-ip` (Cloudflare) or `x-forwarded-for` as fallback — prefer the former. Consider `@upstash/ratelimit` for production-grade limiting.

- [ ] **API routes only return the fields needed.**
  Never return all columns from a public endpoint. Explicitly list fields in the query.

- [ ] **Error messages never expose internals to the client.**
  Raw `error.message` from DB or external APIs must not appear in API responses. Log full errors server-side; return a generic message to the client.

  ```typescript
  catch (error: unknown) {
    console.error('Internal error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
  ```

- [ ] **OAuth flows include a CSRF state parameter.**
  Any OAuth integration must generate a random `state` token, store it server-side, and validate it on callback.

---

## 4. Secrets & Environment Variables

- [ ] **No secrets hardcoded in source files.**
  API keys, tokens, and passwords must only exist in `.env.local` (local) and Vercel environment variables (production). Run a grep before committing: `grep -r "sk_" src/`

- [ ] **`NEXT_PUBLIC_` prefix only on genuinely public values.**
  Never prefix secret keys, service-role tokens, or API credentials with `NEXT_PUBLIC_`.

- [ ] **No PII logged to console.**
  Remove any `console.log` statements that include email addresses, phone numbers, or sensitive asset/user data. Use non-identifying references in logs: `Processing record ID: ${id}` not `Processing ${email}`.

- [ ] **No PII hardcoded in database migrations.**
  Real email addresses, phone numbers, or names must never be committed to migration files. Use placeholder values or environment-driven seed scripts instead.

---

## 5. Data Exposure

- [ ] **New database tables have row-level access controls reviewed.**
  Confirm who can read and who can write to each new table. Public read should be scoped to active/published data and non-sensitive columns only. Authenticated write should be scoped to the correct user role.

- [ ] **Sensitive data is not returned to the client unnecessarily.**
  Internal IDs, audit fields, and contact details must only be accessible in an authenticated context. Public endpoints must not expose internal system fields.

- [ ] **Object storage buckets have correct visibility.**
  Default to private for any new storage bucket. Justify public access explicitly before enabling it. Inspection photos and uploaded documents must never be publicly accessible without a signed URL or auth check.

---

## 6. HTTP Security Headers

- [ ] **All security headers are set in `next.config.ts`.**

  | Header                      | Required value                                |
  |-----------------------------|-----------------------------------------------|
  | `X-Frame-Options`           | `DENY`                                        |
  | `X-Content-Type-Options`    | `nosniff`                                     |
  | `Referrer-Policy`           | `strict-origin-when-cross-origin`             |
  | `Permissions-Policy`        | `geolocation=(), microphone=(), camera=()`    |
  | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`         |
  | `Content-Security-Policy`   | Tuned to the app's actual sources (see below) |

- [ ] **Content-Security-Policy is tuned to the site's actual sources.**
  Must NOT use `unsafe-eval` unless absolutely required. Start with report-only mode when first deploying a new CSP.

---

## 7. XSS & Content Security

- [ ] **Any externally sourced HTML is sanitised before storage and before render.**
  Sanitise on the way in (before DB write) and on the way out (before render).

- [ ] **External URLs are validated before use.**
  Validate format before storing or using in `href`.

  ```typescript
  try { new URL(value); } catch { throw new Error('Invalid URL'); }
  ```

- [ ] **`target="_blank"` links include `rel="noopener noreferrer"`.**
  Prevents tab-napping attacks on external links.

---

## 8. Dependency Management

- [ ] **`npm audit` is run before every production deployment.**
  Resolve all HIGH or CRITICAL vulnerabilities before merging. Command: `npm audit --audit-level=high`

- [ ] **Dependencies are kept up to date.**
  Run `npm update` at minimum monthly.

---

## 9. Pre-Commit Security Checklist

```text
[ ] All new server actions have an auth check at the top
[ ] All new API routes validate auth or are explicitly intended as public
[ ] No dangerouslySetInnerHTML without DOMPurify sanitisation
[ ] No new secrets hardcoded in source
[ ] No PII hardcoded in migrations
[ ] File uploads validated server-side (type + size)
[ ] New tables have access controls reviewed — no open public write access
[ ] No SELECT * on public-facing endpoints
[ ] No PII in console.log statements
[ ] Cron/webhook routes check CRON_SECRET
[ ] External links use rel="noopener noreferrer"
[ ] User input escaped before embedding in HTML emails
[ ] Error messages return generic text to client, full detail logged server-side
[ ] HTTP security headers configured in next.config.ts
[ ] npm audit run — no HIGH/CRITICAL unresolved
```
