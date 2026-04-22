---
description: TypeScript standards for all code in this project — enforced at architecture phase
---
# TypeScript Standards

This document is read at **Phase 1 (Design the Architecture)** before any implementation begins. All new code must comply. Do not skip this in favour of "fixing types later" — fixing types after implementation is always harder.

---

## 1. The Golden Rules

- **Never use `any`.** It disables type checking entirely and defeats the purpose of TypeScript. Every `any` is a future bug waiting to happen.
- **Never use `as SomeType` to silence an error.** If you need a cast, it means the types upstream are wrong — fix them there.
- **Type the shape of your data at the boundary, once.** Define interfaces where data enters the system (API response, DB query, form input) and use them everywhere downstream.

---

## 2. Banned Patterns

These patterns are not allowed in this codebase:

```typescript
// ❌ Never use any
let record: any = null;
function process(data: any) {}
const result = response as any;

// ❌ Never suppress type errors with @ts-ignore
// @ts-ignore
someFunction(badArg);

// ❌ Never use implicit any via missing annotations
function processRecord(record) {} // 'record' implicitly has type 'any'

// ❌ Never cast to bypass a real type mismatch
const premise = maybePremise as Premise; // if maybePremise could be null, handle null
```

---

## 3. Required Patterns

### Define interfaces for all data shapes

Every significant data structure must have a named interface or type alias in a shared location:

```typescript
// src/types/premise.ts
export interface Premise {
  id: string;
  name: string;
  reference: string;
  address: string | null;
  status: 'active' | 'archived';
  created_at: string;
}

export interface PremiseSummary {
  id: string;
  name: string;
  reference: string;
}
```

### Annotate all function signatures

```typescript
// ✅ Input and output types explicit
export async function getPremiseById(id: string): Promise<Premise | null> {}

// ✅ Server action return types declared
export async function archivePremise(id: string): Promise<{ success: boolean; error?: string }> {}

// ✅ React component props typed
interface PremiseCardProps {
  premise: PremiseSummary;
  priority?: boolean;
}
export default function PremiseCard({ premise, priority = false }: PremiseCardProps) {}
```

### Use `unknown` for error handling, not `any`

```typescript
// ✅ Correct error handling pattern
try {
  await someOperation();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('Operation failed:', message);
  return { success: false, error: 'Something went wrong' };
}
```

### Use null-safe access patterns

```typescript
// ✅ Optional chaining and nullish coalescing
const name = premise?.name ?? 'Unnamed';
const address = premise?.address ?? 'Address not set';

// ✅ Narrow nullable types before use
if (!premise) return notFound();
// premise is now non-null below this line
```

---

## 4. TypeScript Config Standards

`tsconfig.json` must have these compiler options enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Never weaken these settings to fix a type error. Fix the type error properly.

---

## 5. Where to Define Types

| What                        | Where                                                |
|-----------------------------|------------------------------------------------------|
| Database row shapes         | `src/types/` or inferred from Drizzle schema         |
| API request/response shapes | `src/types/api.ts`                                   |
| Component props             | Inline in the component file (export only if shared) |
| Server action return types  | Inline return type annotation                        |
| Shared utility types        | `src/types/`                                         |

---

## 6. Drizzle ORM Type Safety

Drizzle infers types from the schema. Use inferred types rather than defining them manually:

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { premises } from '@/db/schema';

type Premise = InferSelectModel<typeof premises>;
type NewPremise = InferInsertModel<typeof premises>;
```

Never write a manual `Premise` interface if a Drizzle-inferred one exists — they will drift apart.

---

## 7. Pre-Implementation Checklist

```text
[ ] All new data shapes have named interfaces or types
[ ] All new functions have annotated input and return types
[ ] No any, @ts-ignore, or implicit any planned
[ ] Error handling uses unknown + instanceof Error narrowing
[ ] Nullable fields handled with optional chaining or null guards
[ ] tsc --noEmit passes cleanly before committing
```
