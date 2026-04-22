---
description: Testing standards — what must be tested, how, and minimum coverage requirements for this stack
---
# Testing Standards

Read this at **Phase 2 (Test)** after implementation. Testing is not optional. The goal is not 100% coverage of every line — it is confidence that critical paths cannot break silently.

---

## 1. What Must Be Tested

Not everything needs a test. Focus testing effort on code where a bug causes:

- A user-facing failure (form submission, data display, file upload)
- A security vulnerability (auth, input validation, rate limiting)
- Data corruption (DB writes, status transitions, publish/archive logic)

### Required tests (no exceptions)

| What                                          | Why                                              |
|-----------------------------------------------|--------------------------------------------------|
| All API route input validation                | Ensures bad input is rejected correctly          |
| Rate limiting logic                           | Ensures abuse protection actually works          |
| Auth guards on protected routes and actions   | Ensures actions can't be called unauthenticated  |
| File upload validation (type + size)          | Prevents malicious or oversized uploads          |
| Slug / reference generation and deduplication | Slug bugs break URLs permanently                 |
| Email template construction                   | Prevents XSS and broken recipient fields         |

### Recommended tests (add when time allows)

| What                                 | Why                                                             |
|--------------------------------------|-----------------------------------------------------------------|
| Third-party API integrations         | External APIs — behaviour should be isolated and verifiable     |
| Revalidation logic in server actions | Easy to forget a revalidatePath; test confirms cache is busted  |
| Data transformation pipelines        | Catches regressions when input format changes                   |

---

## 2. Testing Stack

This project uses **Vitest** (preferred over Jest for Next.js + ESM compatibility):

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "msw": "^2.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 3. File Structure

Tests live next to the code they test:

```text
src/
  app/
    api/
      assets/
        route.ts
        route.test.ts        ← API route tests
      inspections/
        route.ts
        route.test.ts
  lib/
    reference-utils.ts
    reference-utils.test.ts  ← Utility function tests
    actions/
      premises.ts
      premises.test.ts       ← Server action tests
```

---

## 4. API Route Testing Patterns

Test each route for: valid input, invalid input, auth, and rate limit.

```typescript
// src/app/api/assets/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

describe('POST /api/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for missing required fields', async () => {
    const request = new Request('http://localhost/api/assets', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('returns 429 after exceeding rate limit', async () => {
    const ip = '1.2.3.4';
    const makeRequest = () =>
      POST(new Request('http://localhost/api/assets', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }));

    for (let i = 0; i < 30; i++) await makeRequest();
    const response = await makeRequest(); // over limit
    expect(response.status).toBe(429);
  });

  it('rejects invalid file types', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['data'], { type: 'application/exe' }), 'bad.exe');
    const response = await POST(
      new Request('http://localhost/api/assets', { method: 'POST', body: formData })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/file type/i);
  });
});
```

---

## 5. Server Action Testing Patterns

Mock auth and DB; test the logic:

```typescript
// src/app/actions/premises.test.ts
import { describe, it, expect, vi } from 'vitest';
import { updatePremise } from './premises';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: 'user_test123' }),
}));

vi.mock('@/db', () => ({
  db: {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue({ rowCount: 1 }),
  },
}));

describe('updatePremise', () => {
  it('returns success when premise is updated', async () => {
    const result = await updatePremise('premise-id-123', { name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('returns error when not authenticated', async () => {
    const { requireAuth } = await import('@/lib/auth');
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error('Unauthorised'));
    const result = await updatePremise('premise-id-123', { name: 'Updated Name' });
    expect(result.success).toBe(false);
  });
});
```

---

## 6. Utility Function Testing Patterns

Pure functions are the easiest to test — no mocking needed:

```typescript
// src/lib/reference-utils.test.ts
import { describe, it, expect } from 'vitest';
import { generateReference, slugify } from './reference-utils';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Main Building')).toBe('main-building');
  });

  it('removes special characters', () => {
    expect(slugify('Block A & B')).toBe('block-a-b');
  });

  it('deduplicates multiple hyphens', () => {
    expect(slugify('Floor -- 2')).toBe('floor-2');
  });
});

describe('generateReference', () => {
  it('produces uppercase alphanumeric reference', () => {
    const ref = generateReference('premises', 1);
    expect(ref).toMatch(/^PRE-\d{4}$/);
  });
});
```

---

## 7. Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm test -- --watch

# Run with coverage report
npm run test:coverage

# Run a specific test file
npm test src/app/api/assets/route.test.ts
```

### Coverage targets

| Area                           | Minimum coverage                                 |
|--------------------------------|--------------------------------------------------|
| API route validation logic     | 90%                                              |
| Server action auth checks      | 100%                                             |
| Utility functions (`src/lib/`) | 80%                                              |
| React components               | No minimum — test behaviour, not implementation  |

---

## 8. Pre-Commit Checklist

```text
[ ] Tests written for all new API routes (valid, invalid, auth, rate limit cases)
[ ] Tests written for all new server actions (success, unauthenticated cases)
[ ] Tests written for all new utility functions in src/lib/
[ ] npm test passes with no failures
[ ] No tests skipped with .skip or .only left in test files
```
