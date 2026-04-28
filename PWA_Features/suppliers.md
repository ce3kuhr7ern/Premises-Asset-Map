# Feature: Suppliers / Contractors

**Version:** v1.0
**Status:** Planned — Phase 1 (awaiting implementation sign-off)
**Routes:**

- `/suppliers` — list / filter / search
- `/suppliers/[id]` — single contractor detail with work history

**Surface:** Web application — back-office PWA for the secretary and trustees.

---

## 1. Purpose

A village hall uses the same trusted contractors year after year — the same gas-safe engineer, the local electrician, the fire-safety inspector who came last March. Today these live in the secretary's address book, paper folder, or memory. When the boiler service is due again, the secretary digs out the right phone number, retypes the same email, and hopes the rate card hasn't changed.

The Suppliers feature makes contractors first-class data:

- Each contractor has structured contact details, categories, and notes
- Compliance items link to the contractor that did (or will do) the work — so "who did our boiler service last year?" becomes a single click
- Quotes and certificates uploaded against a compliance item can be tagged with the contractor that produced them
- Work history surfaces per contractor: which compliance items they've satisfied, with what cost
- A future Communications module (next feature) emails them directly from the platform

This feature ships **the data layer + CRUD UI**. Outbound communications (emailing contractors for quotes, booking confirmations, multi-channel including WhatsApp/SMS) are explicitly the next feature, not this one — see §13.

---

## 2. UX / UI

### 2.1 `/suppliers` — list page

Header: "Suppliers" + primary action "Add Supplier" (top right).

Filter row:

- **Search** — name, contact name, email, phone
- **Category chips** — multi-select, populated from `contractor_categories` (Gas Safe, Electrician, Plumber, Fire Safety, PAT Testing, Building Maintenance, Locksmith, Cleaning, Pest Control, Security, Other)
- **Status chips** — All / Active / Archived

Default sort: name ascending. Status badge logic mirrors Asset Register / Compliance Register: green for Active, grey for Archived.

#### Desktop table columns

| # | Column        | Notes                                                   |
|---|---------------|---------------------------------------------------------|
| 1 | Name + icon   | `Wrench` lucide icon + supplier name                    |
| 2 | Categories    | Pill chips (max 3 visible, "+N more" overflow)          |
| 3 | Contact       | Contact name (if set), or "—"                           |
| 4 | Email         | Mailto link                                             |
| 5 | Phone         | Tel link                                                |
| 6 | Last used     | Most recent compliance item where this contractor was scheduled or completed; or "Never" |
| 7 | Status        | Active / Archived badge                                 |
| 8 | Actions       | Edit, Archive (or Restore for archived)                 |

Row click → detail page.

#### Mobile

Card-per-supplier with name, primary category chip, contact-or-email, status badge. Tap → detail.

### 2.2 `/suppliers/[id]` — detail page

Two-column on desktop:

**Left:**
- **Identity card** — name, contact name, email, phone, address, website
- **Categories** — pill chips
- **Notes** — long-form free text

**Right:**
- **Work history card** — list of compliance items where `contractor_id = this`, ordered by status then `last_completed_at DESC`. Each row links to the compliance detail page. Includes status badge and date.
- **Recent documents card** — documents linked to compliance items this contractor worked on (quotes and certificates). v1.0 keeps this simple — limited to documents linked via `documents.compliance_item_id` where the compliance item's `contractor_id` matches.

### 2.3 Create / Edit — inline panel on `/suppliers`

Fields:

- **Name** (text, required, max 200) — "ABC Plumbing Ltd"
- **Categories** (multi-select chips, required, at least one)
- **Contact name** (text, optional, max 200) — "Sam Patel"
- **Email** (email, optional, max 200) — primary email used for future comms
- **Phone** (text, optional, max 50)
- **Address** (textarea, optional)
- **Website** (URL, optional, max 500)
- **Notes** (textarea, optional, max 5000) — internal notes (rate card, preferred timing, who recommended them)

The Communications module will later add per-supplier email-template overrides. For v1.0, just a single email field.

### 2.4 Compliance Register integration — see §11

The compliance Schedule action and the compliance detail page both gain a contractor selector. Detail page surfaces the linked contractor with a clickable link.

---

## 3. API

### 3.1 Server actions — `src/app/actions/suppliers.ts`

| Action                         | Description                                                        |
|--------------------------------|--------------------------------------------------------------------|
| `createContractor(data)`       | Insert row + category assignments, validate                        |
| `updateContractor(id, data)`   | Update fields, re-sync category assignments                        |
| `archiveContractor(id)`        | Soft delete — set `status='archived'`                              |
| `restoreContractor(id)`        | Reverse — set `status='active'`                                    |
| `deleteContractor(id)`         | Hard delete — only when no compliance items reference it           |
| `listContractorsForCurrentOrg()` | Server-side fetch for the list page                              |
| `getContractorDetail(id)`      | Detail page load — contractor + categories + work history          |
| `setContractorOnCompliance(complianceId, contractorId)` | Set/unset on a compliance item, called from Compliance Register |

All return `Promise<{ success: true; data?: T } | { success: false; error: string }>`.

### 3.2 API route — `GET /api/suppliers`

For typeahead in the Compliance Register schedule modal. Query params: `q`, `category`, `status` (defaults to `active`), `limit`, `cursor`.

Response: `{ success: true, data: ContractorSummary[] }`.

`ContractorSummary`:

```typescript
{
  id: string;
  name: string;
  primaryCategory: string | null;  // first category's name for display
  email: string | null;
  phone: string | null;
}
```

---

## 4. Database

### 4.1 New tables

```sql
-- contractor_categories — lookup (Gas Safe, Electrician, etc.). Global, no org_id.
CREATE TABLE IF NOT EXISTS contractor_categories (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         text        NOT NULL UNIQUE,           -- 'gas-safe', 'electrician'
  name         text        NOT NULL,                  -- 'Gas Safe', 'Electrician'
  display_order integer    NOT NULL DEFAULT 100,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- contractors — the directory itself, scoped per organisation
CREATE TABLE IF NOT EXISTS contractors (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  contact_name    text,
  email           text,
  phone           text,
  address         text,
  website         text,
  notes           text,
  status          text        NOT NULL DEFAULT 'active',  -- 'active' | 'archived'
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contractors_org_idx    ON contractors (organisation_id);
CREATE INDEX IF NOT EXISTS contractors_status_idx ON contractors (status);

-- contractor_category_assignments — M2M join. A contractor can be in many categories.
CREATE TABLE IF NOT EXISTS contractor_category_assignments (
  contractor_id uuid NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  category_id   uuid NOT NULL REFERENCES contractor_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (contractor_id, category_id)
);

CREATE INDEX IF NOT EXISTS contractor_assign_cat_idx ON contractor_category_assignments (category_id);
```

### 4.2 Compliance Register integration — add the FK

The `compliance_items.contractor_id` column exists but has no FK constraint (Compliance Register v1.0 §12 #1 — "Don't enforce the FK constraint until Suppliers feature ships"). Add it now:

```sql
ALTER TABLE compliance_items
  ADD CONSTRAINT compliance_items_contractor_fkey
  FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS compliance_items_contractor_idx ON compliance_items (contractor_id);
```

If any rows currently have non-null `contractor_id` values that don't reference a real contractor (they shouldn't — the column is brand new), the migration aborts. Verify before running:

```sql
SELECT id, contractor_id FROM compliance_items WHERE contractor_id IS NOT NULL;
```

### 4.3 Migrations

- `20260429_add_contractors.sql` — create the three tables + indexes
- `20260429_seed_contractor_categories.sql` — seed default categories
- `20260429_link_contractors_to_compliance.sql` — add FK constraint to compliance_items.contractor_id

### 4.4 Drizzle schemas

- New: `src/db/schema/contractor_categories.ts`, `contractors.ts`, `contractor_category_assignments.ts`
- Update: `src/db/schema/compliance_items.ts` — wire the FK reference into Drizzle now that the constraint exists at DB level
- Export from `src/db/schema/index.ts`

### 4.5 Seeded categories

```sql
INSERT INTO contractor_categories (slug, name, display_order) VALUES
  ('gas-safe',             'Gas Safe',             10),
  ('electrician',          'Electrician',          20),
  ('plumber',              'Plumber',              30),
  ('fire-safety',          'Fire Safety',          40),
  ('pat-testing',          'PAT Testing',          50),
  ('building-maintenance', 'Building Maintenance', 60),
  ('locksmith',            'Locksmith',            70),
  ('cleaning',             'Cleaning',             80),
  ('pest-control',         'Pest Control',         90),
  ('security',             'Security',            100),
  ('grounds',              'Grounds & Gardens',   110),
  ('other',                'Other',               999)
ON CONFLICT (slug) DO NOTHING;
```

---

## 5. Validation

### 5.1 Client-side

- Name: required, max 200
- Categories: required, at least one selected
- Email: if provided, must look like an email (basic regex; defer real validation to comms feature)
- Phone, address, website, notes: max-length checks per §2.3
- Website: must start with `http://` or `https://` (auto-prepend if missing)

### 5.2 Server-side

```typescript
if (!name?.trim() || name.trim().length > 200) return { success: false, error: 'Name is required and under 200 chars.' };
if (!categoryIds || categoryIds.length === 0) return { success: false, error: 'Select at least one category.' };
const allCategoriesExist = await verifyCategories(categoryIds);
if (!allCategoriesExist) return { success: false, error: 'Invalid category selected.' };
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Email is not valid.' };
if (website && website.length > 500) return { success: false, error: 'Website URL too long.' };
if (notes && notes.length > 5000) return { success: false, error: 'Notes too long.' };
```

---

## 6. Error Handling

- `loading.tsx` — skeleton table on `/suppliers`, skeleton card on `/suppliers/[id]`
- `error.tsx` — "Could not load suppliers. Please refresh the page." + retry
- `not-found.tsx` on detail page — "Supplier not found or has been deleted"
- Empty state on register: "No suppliers yet. Add your first contractor to start tracking compliance work." + Add Supplier CTA
- Server action errors surface inline with `role="alert"`
- **Hard delete blocked**: when a contractor is referenced by any compliance item (active or completed history), `deleteContractor` returns `"This contractor is referenced by compliance items. Archive them instead — the history is preserved."`
- **Archived contractors do not appear in the schedule modal typeahead** but do appear on existing compliance items' detail pages (read-only)

---

## 7. Accessibility

- Single `<h1>Suppliers</h1>` per page
- Category chips are toggle buttons with `aria-pressed`
- Email and phone are real `mailto:` / `tel:` links — work with screen readers and mobile native handlers
- Multi-select category control in the form uses `<fieldset><legend>Categories</legend>` with checkbox descendants — proper grouping for assistive tech
- Status badges include `<span className="sr-only">Status: </span>`
- Touch targets ≥ 44 × 44 px on mobile

---

## 8. Security

- All `/suppliers` routes covered by `isAppHost` → `auth.protect()` middleware
- Server actions: `resolveCurrentUser()` → `can(clerkId, Permission.ManageContractors)` (new permission — see §12 #1)
- Multi-tenancy: every contractor query scoped by `organisation_id`; never accept it from client
- Email field deliberately not validated for deliverability — that's the Communications feature's concern. v1.0 accepts whatever the trustees enter.
- Notes free-text trimmed and length-limited
- Server action error messages stay generic; full errors logged with `console.error('[contractorAction]', err)`

---

## 9. Performance

- `/suppliers` is a server component; initial load fetches first 100 contractors (rare for a single village hall to exceed)
- Each contractor's category assignments fetched in a single second query with `inArray(contractor_id, …)` to avoid N+1
- `last_used` per contractor computed via a left-join subquery on `compliance_items` — single query
- No pagination needed for v1.0; cursor pagination added if a trust ever exceeds 100 contractors

---

## 10. Testing

### 10.1 Required tests

- `createContractor`: valid → row inserted; missing name → fail; missing categories → fail; invalid email format → fail; cross-org category id → fail
- `updateContractor`: re-syncs category assignments (deleted ones removed, new ones added); cross-org id → fail
- `archiveContractor`: sets `status='archived'`; archived contractors don't appear in schedule typeahead
- `deleteContractor`: blocked when compliance_items reference the contractor; succeeds when no references
- `setContractorOnCompliance`: sets contractor_id; cross-org contractor → fail; cross-org compliance item → fail
- `GET /api/suppliers`: returns only authenticated user's organisation; category and status filters work; archived hidden by default

### 10.2 Manual verification

- Add "ABC Plumbing" with categories Plumber + Gas Safe → appears in list with both chips
- Open Annual Oil Boiler Service compliance item → Schedule modal → typeahead shows ABC Plumbing → select → status moves to scheduled, item detail shows the contractor link
- Click contractor on compliance detail → /suppliers/[id] opens with this compliance item in work history
- Archive ABC Plumbing → schedule typeahead no longer shows them, but the existing compliance item still displays (read-only)
- Try to delete an archived contractor that's referenced → blocked with clean error
- Mobile: card layout renders, multi-select category form works

---

## 11. Compliance Register integration (this feature also bumps Compliance Register to v1.2)

### 11.1 Schedule modal gains contractor typeahead

Currently `transitionStatus(id, 'scheduled')` is a one-click move with no contractor capture. With Suppliers shipping, the action panel's "Schedule" button opens a small modal (instead of firing the transition directly):

- **Contractor** — typeahead select against `/api/suppliers?q=...` (active contractors only)
- **Scheduled date** — date input, optional
- **Notes** — free text

On submit: writes `contractor_id` and an optional `scheduled_for` (a new column? — see below) to `compliance_items`, transitions status to `scheduled`, records a `compliance_events` entry with `payload.contractorId`.

For v1.0 of this feature, scheduling without a contractor is still allowed (to preserve the existing "skip-supplier" flow) — the contractor is optional in the modal.

**Schema delta**: add `compliance_items.scheduled_for date` to capture the booking date. Migration: `20260429_add_compliance_scheduled_for.sql` (additive, nullable).

### 11.2 Compliance detail page — contractor card

The right-column sidebar gets a new card **above** "Linked to":

```
Contractor
─────────────
ABC Plumbing Ltd
Sam Patel · sam@abcplumbing.co.uk
[Change]
```

Clicking the contractor name → /suppliers/[id]. The "Change" link reopens the typeahead modal.

For items with no contractor set, the card shows "No contractor assigned" with a "Set contractor" CTA.

### 11.3 Asset detail page — Compliance items card unchanged

No change to the asset detail surface — the Compliance items card already links to the compliance detail page where the contractor is visible.

### 11.4 Compliance Register changelog will record

| v1.2 | 2026-04-28 | Suppliers integration. Schedule action gains contractor typeahead + optional scheduled date. Detail page gains contractor card. Schema: `compliance_items.contractor_id` FK constraint enforced + new `scheduled_for` date column. |

---

## 12. Pre-implementation blockers (resolved 2026-04-28)

1. **New `Permission.ManageContractors`** — confirmed: held by `trust_admin`, `trustee`, and `club_manager`. `ViewContractors` (read-only) held additionally by `club_user` and `auditor`. Per-trustee finer-grained scoping (e.g. only the secretary can edit) is a v1.1 enhancement, deferred.
2. **Compliance Register v1.0 contractor_id column** — verified clean (no rogue values) before running the FK migration.
3. **Schedule action UX change** — confirmed: the Schedule button becomes a modal capturing contractor + optional date + notes. The contractor field is optional in the modal so the existing "skip-supplier" flow is preserved.
4. **API route auth caching** — `/api/suppliers` is hit on every keystroke during typeahead search. Already protected by middleware but worth ensuring the `resolveCurrentUser()` lookup is fast (it already caches via Clerk session in practice). If perf is poor under load, add a short-lived per-request memo.
5. **Categories** — confirmed: the 12 seeded categories (Gas Safe, Electrician, Plumber, Fire Safety, PAT Testing, Building Maintenance, Locksmith, Cleaning, Pest Control, Security, Grounds & Gardens, Other) are sufficient for v1.0. Trust-admin-managed category CRUD deferred to a future enhancement.

---

## 13. Out of scope (deferred to next feature: Communications)

These belong to the **Supplier Communications** feature, not this one:

- Sending emails to contractors (quote requests, booking confirmations, follow-ups)
- Email templates per category or per type of compliance work
- Tracking sent / delivered / opened
- Multi-channel: WhatsApp, SMS
- Reply tracking and quote attachment workflows
- Per-supplier comm preferences (email vs WhatsApp vs phone-only)
- Audit log of all outbound comms

These will get their own feature doc once Suppliers ships.

Also out of scope for v1.0 of this feature:

- **Rate cards / cost history** — `compliance_items.cost_cents` already captures per-job cost; aggregating across a contractor is a future read-side enhancement
- **Reviews / ratings** — trustees might want to score contractors over time; not v1.0
- **Multi-site pricing differences** — single-site MVP per project rule
- **Contractor self-service portal** — contractors will not have logins in v1.0; everything is trustee-side data entry

---

## Changelog

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0    | 2026-04-28 | Initial spec — `contractors` directory with M2M categories, list + detail UI, archive/restore, compliance integration (Schedule typeahead + detail card), `compliance_items.contractor_id` FK constraint enforced, new `scheduled_for` column. Outbound comms explicitly deferred to the next feature (§13). |
