---
description: API route and server action design standards — response shapes, validation, auth, and rate limiting
---
# API Design Standards

Read this at **Phase 1 (Design the Architecture)** whenever a feature introduces new API routes or server actions. Consistent API design prevents a class of bugs, makes error handling predictable, and makes testing straightforward.

---

## 1. Choosing Between API Routes and Server Actions

| Use case                                                    | Use                                             |
|-------------------------------------------------------------|-------------------------------------------------|
| Form submissions from client components                     | Server action                                   |
| Admin CRUD operations                                       | Server action                                   |
| Triggered by external systems (cron, webhooks)              | API route                                       |
| Polled by client-side JS (search suggestions, autocomplete) | API route                                       |
| File uploads from client                                    | API route (server actions have 1 MB body limit) |
| Third-party OAuth callback                                  | API route                                       |

**Default to server actions** for anything triggered by user interaction inside the app. They have built-in CSRF protection, co-locate with the feature, and work without a round-trip to a URL.

---

## 2. Standard Response Shape

Every API route must use the same response envelope. No exceptions.

```typescript
// The standard shape — define once, use everywhere
type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ✅ Success response
return NextResponse.json({ success: true, data: { assetId: '123' } });

// ✅ Error response
return NextResponse.json(
  { success: false, error: 'File type not supported.' },
  { status: 400 }
);

// ❌ Inconsistent shapes — never do this
return NextResponse.json({ results: assets });        // No success field
return NextResponse.json({ error: 'Bad request' });   // No success field
return NextResponse.json({ ok: true });               // Non-standard field
```

**Server actions** return the same shape but without the `NextResponse` wrapper:

```typescript
// ✅ Server action result shape
return { success: true };
return { success: false, error: 'Validation failed.' };
```

---

## 3. HTTP Status Codes

Use the correct status code — clients and monitoring tools rely on them:

| Situation                                | Status code |
|------------------------------------------|-------------|
| Success                                  | `200`       |
| Resource created                         | `201`       |
| Bad input / validation failure           | `400`       |
| Unauthenticated (no session)             | `401`       |
| Forbidden (authenticated, no permission) | `403`       |
| Resource not found                       | `404`       |
| Rate limit exceeded                      | `429`       |
| Unexpected server error                  | `500`       |

---

## 4. Input Validation

**Validate all input server-side, always.** Client-side validation is a UX convenience — it can be bypassed. The server is the only trust boundary.

### Validation checklist for every endpoint

```typescript
export async function POST(request: Request) {
  // 1. Parse body safely
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  // 2. Validate types and shapes
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: 'Invalid input.' }, { status: 400 });
  }

  const { name, email } = body as Record<string, unknown>;

  // 3. Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ success: false, error: 'Name is required.' }, { status: 400 });
  }

  // 4. Validate lengths
  if (name.trim().length > 200) {
    return NextResponse.json({ success: false, error: 'Name is too long.' }, { status: 400 });
  }

  // 5. Validate formats
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return NextResponse.json({ success: false, error: 'Valid email is required.' }, { status: 400 });
  }

  // Proceed with validated, trimmed data
  const safeName = name.trim();
  const safeEmail = String(email).trim().toLowerCase();
}
```

### Search query validation

Search endpoints must validate the query string to prevent DoS:

```typescript
const q = url.searchParams.get('q') ?? '';

if (q.length < 2) return NextResponse.json({ success: true, data: [] });
if (q.length > 100) return NextResponse.json({ success: true, data: [] });
if (!/^[\w\s\-'.]+$/u.test(q)) return NextResponse.json({ success: true, data: [] });
```

---

## 5. Rate Limiting

Every publicly accessible API route (no auth required) must have rate limiting.

### Standard in-memory pattern (for low-traffic routes)

```typescript
// src/lib/rate-limit.ts
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();

  return function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = store.get(ip);

    // Clean up expired entries periodically
    if (store.size > 5000) {
      for (const [key, val] of store.entries()) {
        if (now > val.resetAt) store.delete(key);
      }
    }

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return true; // allowed
    }

    if (entry.count >= maxRequests) return false; // blocked

    entry.count++;
    return true; // allowed
  };
}
```

```typescript
// Usage in a route
import { createRateLimiter } from '@/lib/rate-limit';

const checkRateLimit = createRateLimiter(30, 60_000); // 30 req/min

export async function GET(request: Request) {
  const ip = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')
    ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }
  // ...
}
```

**For high-traffic routes:** use `@upstash/ratelimit` backed by Redis — survives server restarts and works across multiple Vercel instances.

---

## 6. Only Return What's Needed

Never fetch all columns on a public endpoint. Explicitly list the fields to avoid accidentally exposing internal data:

```typescript
// ✅ Only return what the client needs
const assets = await db
  .select({ id: premises.id, name: premises.name, reference: premises.reference })
  .from(premises)
  .where(eq(premises.status, 'active'));

// ❌ Never return all columns on a public endpoint
const assets = await db.select().from(premises);
// Exposes: internal_notes, owner_contact, created_by, audit_fields...
```

---

## 7. Cron and Webhook Endpoints

Internal endpoints triggered by external systems must validate a shared secret:

```typescript
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');

  // Both conditions must pass — never skip if env var is missing
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorised' }, { status: 401 });
  }
  // ...
}
```

---

## 8. Error Response Rules

1. **Never return `error.message` from a caught exception to the client.** It may contain stack traces, DB table names, or internal paths.
2. **Always log the full error server-side** before returning a generic message.
3. **Distinguish between user errors (4xx) and server errors (5xx)** — a validation failure is `400`, not `500`.

```typescript
// ✅ Correct error handling
} catch (error: unknown) {
  console.error('[/api/assets] Unexpected error:', error);
  return NextResponse.json(
    { success: false, error: 'Something went wrong. Please try again.' },
    { status: 500 }
  );
}
```

---

## 9. Pre-Implementation Checklist

```text
[ ] Decided: server action vs API route (and documented why if non-obvious)
[ ] All success and error responses use { success, data/error } shape
[ ] Correct HTTP status codes planned for each response path
[ ] All input fields have: required check, type check, length limit, format check
[ ] Rate limiting applied to all unauthenticated endpoints
[ ] Only required columns listed in SELECT — no SELECT *
[ ] Cron/webhook routes use CRON_SECRET — check is unconditional
[ ] Error responses return generic messages; full error logged server-side
[ ] Tests planned for: valid input, invalid input, auth, rate limit cases
```
