---
description: Error handling standards — error boundaries, loading states, API errors, and user feedback patterns
---
# Error Handling Standards

Read this at **Phase 2 (Write the Code)**. Every new page and API route must handle the three failure states: loading, error, and empty. A blank white screen or an unhandled promise rejection is never acceptable in production.

---

## 1. Next.js App Router Error Files

Every significant route segment must have these three files alongside `page.tsx`:

### `loading.tsx` — shown during data fetching

```typescript
// app/premises/loading.tsx
export default function Loading() {
  return (
    <div className="container py-16">
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
```

### `error.tsx` — shown when a component throws

```typescript
// app/premises/error.tsx
'use client'; // error.tsx must be a Client Component

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="container py-16 text-center">
      <h2 className="text-2xl font-semibold mb-4">
        Something went wrong
      </h2>
      <p className="text-muted-foreground mb-8">
        We couldn't load this page. Please try again.
      </p>
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
```

### Root error and 404 boundaries (site-wide)

```typescript
// app/error.tsx       — catches any unhandled throw in the app
// app/not-found.tsx   — shown for all 404s
```

**Rule:** Every new top-level route segment (`app/[segment]/`) must have its own `error.tsx` and `loading.tsx`.

---

## 2. Server Actions

Server actions must always return a typed result object. They must never throw to the client.

```typescript
// ✅ Correct pattern — return result, never throw
export async function updateAsset(assetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth();
    // ... operation
    revalidatePath('/premises');
    return { success: true };
  } catch (error: unknown) {
    console.error('updateAsset failed:', error);
    return { success: false, error: 'Failed to update asset. Please try again.' };
  }
}

// ❌ Never throw from a server action
export async function updateAsset(assetId: string) {
  // ...
  throw new Error('DB write failed'); // Client gets an unhandled error
}
```

**Client-side handling of server actions:**

```typescript
'use client';
const result = await updateAsset(assetId);
if (!result.success) {
  setError(result.error ?? 'Something went wrong');
  return;
}
// proceed with success state
```

---

## 3. API Routes

All API routes must follow the same error shape:

```typescript
// Standard response type — use this consistently
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ✅ Correct error handling in an API route
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // ... validate, process

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error('POST /api/assets error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
```

**Rules for API error messages:**

- Return generic messages to the client — never raw `error.message`
- Always log the full error server-side with `console.error`
- Use the correct HTTP status codes: `400` for bad input, `401` for unauthenticated, `403` for forbidden, `404` for not found, `500` for unexpected failures
- Always include `{ success: false }` so client code can check a single field

---

## 4. Loading States in Client Components

Every client component that triggers an async operation must track loading state:

```typescript
'use client';

export default function SaveButton({ assetId }: { assetId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      const result = await updateAsset(assetId);
      if (!result.success) {
        setError(result.error ?? 'Something went wrong');
      }
    });
  }

  return (
    <>
      <button
        onClick={handleSave}
        disabled={isPending}
        aria-busy={isPending}
        className="btn-primary"
      >
        {isPending ? 'Saving…' : 'Save Asset'}
      </button>
      {error && (
        <p role="alert" className="text-destructive text-sm mt-2">{error}</p>
      )}
    </>
  );
}
```

**Rules:**

- Disable the button while pending — prevent double submissions
- Use `aria-busy` to communicate loading state to assistive tech
- Always show a visible error message if the action fails — never silently fail
- Use `role="alert"` on error messages so screen readers announce them immediately

---

## 5. Empty States

Every data list must handle the empty case explicitly:

```typescript
// ✅ Explicit empty state with helpful copy
if (assets.length === 0) {
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground text-lg">No assets found matching your search.</p>
      <p className="text-muted-foreground text-sm mt-2">
        Try adjusting your filters or{' '}
        <Link href="/assets/new" className="underline">add a new asset</Link>.
      </p>
    </div>
  );
}

// ❌ Silent empty — user sees a blank area with no explanation
{assets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
```

---

## 6. `notFound()` for Missing Resources

When a dynamic route cannot find its resource, call `notFound()` — never render a blank page or throw:

```typescript
// app/premises/[id]/page.tsx
const premise = await getPremiseById(id);
if (!premise) notFound(); // Renders app/not-found.tsx with correct 404 status
```

---

## 7. Pre-Implementation Checklist

```text
[ ] New route segment has loading.tsx and error.tsx alongside page.tsx
[ ] Root app/error.tsx and app/not-found.tsx exist
[ ] All server actions return { success, error? } — never throw to client
[ ] All API routes return { success, error } shape with correct status codes
[ ] Error messages to client are generic; full error logged server-side
[ ] Client components track isPending and show disabled state while loading
[ ] Error messages use role="alert" for screen reader announcement
[ ] All data lists have an empty state with helpful copy
[ ] Dynamic routes call notFound() when resource is missing
```
