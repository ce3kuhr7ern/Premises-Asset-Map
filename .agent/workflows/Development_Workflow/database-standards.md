---
description: Neon/PostgreSQL database standards — schema conventions, migration rules, JSONB contracts, and Drizzle ORM usage
---
# Database Standards

This document defines database conventions for the project. Consistency and type safety are critical for reliable data operations across all features.

## Database Contract Philosophy

The schema is the source of truth. All application code must conform to the defined schema.

- **Deterministic Schema**: Every piece of data has a designated column. No "spare" columns or generic catch-alls.
- **No Implicit Fields**: Data must not be stored in arbitrary keys of JSONB blobs. Every JSONB column must have a documented, stable structure.
- **Consistent JSON Structures**: JSONB fields must strictly follow their defined TypeScript interfaces to ensure reliability for both the UI and any automated processing.
- **AI Constraint**: AI agents must never invent columns or attempt to write to fields not defined in the schema.

---

## Neon / PostgreSQL Conventions

This project uses [Neon](https://neon.tech/) as its Postgres database, accessed via Drizzle ORM.

### Naming conventions

| Object        | Convention              | Example                                       |
|---------------|-------------------------|-----------------------------------------------|
| Tables        | `snake_case`, plural    | `premises`, `asset_inspections`               |
| Columns       | `snake_case`            | `created_at`, `asset_type`                    |
| Primary keys  | `uuid`                  | `id uuid NOT NULL DEFAULT gen_random_uuid()`  |
| Timestamps    | `timestamptz`           | `created_at`, `updated_at`                    |
| Status fields | `text` with enum values | `status text NOT NULL DEFAULT 'active'`       |
| Foreign keys  | `{table_singular}_id`   | `premise_id`, `user_id`                       |

### Required columns on every table

Every new table must include:

```sql
id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now()
```

Keep `updated_at` current by updating it explicitly in every UPDATE operation, or by attaching a trigger.

---

## JSONB Fields

JSONB columns are acceptable for genuinely variable or nested data. Every JSONB column must have:

1. A TypeScript interface documenting its exact shape.
2. Zod or manual validation before every write.
3. A schema-level default (`DEFAULT '{}'` or `DEFAULT '[]'`).

```typescript
// ✅ Documented JSONB shape — typed and validated before write
interface AssetMetadata {
  manufacturer: string | null;
  model: string | null;
  installDate: string | null;
  tags: string[];
}

// ❌ Opaque JSONB — shape unknown, no validation
type AssetMetadata = Record<string, unknown>;
```

### JSON structure contracts

For each JSONB column, define its contract alongside the Drizzle schema file. Example:

```typescript
// db/schema/inspections.ts
export const inspections = pgTable('inspections', {
  id: uuid('id').defaultRandom().primaryKey(),
  // ...
  findings: jsonb('findings').$type<InspectionFinding[]>().default([]).notNull(),
});

// Contract: findings must be an array of InspectionFinding
export interface InspectionFinding {
  area: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  photoUrls: string[];
}
```

---

## Migration Rules

All schema changes must go through versioned migration files.

- **Idempotent additions**: Use `ADD COLUMN IF NOT EXISTS` for new columns.
- **Never DROP without review**: Never drop a column or table without a verified backup and explicit sign-off. Prefer soft-deletes (`status = 'archived'`) over hard deletes.
- **No type changes without a migration plan**: Changing a column type requires a data transformation script.
- **No real data in migrations**: Never hardcode email addresses, names, phone numbers, or any PII in migration files — use placeholder values or environment-driven seed scripts.
- **One concern per migration file**: Each file should make a single logical change (add a table, add an index, add a column).
- **Timestamps in filenames**: Name migrations with a sortable timestamp prefix — e.g., `20260422_add_inspection_findings.sql`.

---

## Drizzle ORM Usage

Use Drizzle-inferred types rather than writing interfaces manually:

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { premises } from '@/db/schema';

type Premise = InferSelectModel<typeof premises>;
type NewPremise = InferInsertModel<typeof premises>;
```

Never define a manual type that duplicates a Drizzle schema type — they will drift apart.

### Query safety rules

- **Never `SELECT *` on public-facing endpoints.** Explicitly list columns to avoid exposing sensitive fields.
- **Use Drizzle's query builder.** It is parameterised by default — never use raw SQL string interpolation with user input.
- **Scope queries to the authenticated context.** Admin routes use a service-role or elevated client; public queries are read-only and scoped to active/published records only.

```typescript
// ✅ Explicit column selection on a public endpoint
const results = await db
  .select({ id: premises.id, name: premises.name, reference: premises.reference })
  .from(premises)
  .where(eq(premises.status, 'active'));

// ❌ Never return all columns on a public endpoint
const results = await db.select().from(premises);
```

---

## Rules for AI Agents

1. Never assume a column exists unless it is defined in the Drizzle schema files.
2. Never invent new keys in JSONB objects unless the TypeScript interface defines them.
3. Never ALTER the table schema — only read and write data.
4. Validate all generated data against defined TypeScript types before attempting a database write.
5. Never use `SELECT *` — always name the columns needed.

---

## Pre-Implementation Checklist

```text
[ ] New tables have id, created_at, updated_at columns
[ ] Column and table names follow snake_case convention
[ ] Foreign key columns follow {table_singular}_id naming
[ ] JSONB columns have a documented TypeScript interface and Zod/manual validation
[ ] JSONB columns have a schema-level default value
[ ] No PII or real data hardcoded in migration files
[ ] Migration file uses ADD COLUMN IF NOT EXISTS for additive changes
[ ] Migration filename has a sortable timestamp prefix
[ ] Drizzle schema updated alongside the migration file
[ ] No SELECT * in public-facing queries
[ ] No raw SQL string interpolation with user input
```
