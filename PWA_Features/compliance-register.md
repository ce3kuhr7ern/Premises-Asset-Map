# Feature: Compliance Register

**Version:** v1.1
**Status:** v1.0 spec confirmed 2026-04-28. v1.1 (voting/CIO governance trajectory captured, see §13.1) — ready for implementation.
**Routes:**

- `/compliance` — register list / filter / search
- `/compliance/[id]` — single compliance item detail with lifecycle timeline
- (Asset detail page gets a new "Compliance items" card linking here)

**Surface:** Web application — back-office PWA for trustees and the secretary.

---

## 1. Purpose

The platform now knows **what** the trust owns (Asset Register) and **what proof exists** (Document Vault). The missing layer is **what is due, when, and who's accountable**.

A village hall has dozens of recurring obligations:

- Per-asset: annual fire-extinguisher service, biennial PAT testing, 5-year flue inspection
- Trust-level: GDPR audit, safeguarding policy review, public liability insurance renewal, charity commission filing

Today these live in heads, spreadsheets, and email threads. The Compliance Register makes them first-class data: every obligation has a due date, a status, an owner, an audit trail of approvals, and (when satisfied) a link to the document that proves it.

This is the data foundation for two later modules:

- **Notifications** reads compliance items to alert trustees in advance
- **Supplier Communications** sends quote requests and booking confirmations against compliance items

This doc covers the register itself. Notifications and supplier comms get their own feature docs.

---

## 2. The lifecycle this models

The user's workflow (captured 2026-04-28) is:

```
1.  Compliance item exists with a due date in the future
2.  90/60/30 days before due → all trustees alerted (Notifications module)
3.  Secretary contacts trusted supplier(s) for a quote (Supplier Comms module)
4.  Quote received → recorded against the compliance item
5.  Quote approved at next trustees meeting OR async via email/WhatsApp
6.  Approval recorded in PAM (this module captures it)
7.  Work scheduled with supplier
8.  Work done; supplier issues certificate / report
9.  Document uploaded → linked to the compliance item → item marked complete
10. If recurring: a new compliance item is auto-created for the next cycle
```

Every step above is observable in the register. The `status` field tracks where in the lifecycle each item is.

### 2.1 Lifecycle status

A simple enum on `compliance_items.status`:

| Status              | Meaning                                                                | Typical entry point                |
| ------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| `pending`           | Obligation exists, no action yet started                               | Item created (manually or auto)    |
| `quoting`           | Secretary is getting quotes from suppliers                             | Manual: "Start quoting"            |
| `awaiting_approval` | Quote in hand, needs trustee approval                                  | Quote attached → "Request approval"|
| `approved`          | Trustees signed off, work to be scheduled                              | Approval recorded                  |
| `scheduled`         | Date booked with supplier                                              | Manual: "Schedule"                 |
| `completed`         | Work done, satisfaction document uploaded                              | Document linked → "Mark complete"  |
| `overdue`           | Computed: `next_due` in the past AND status not in `completed`         | Computed at query time             |
| `cancelled`         | Item retired without action (e.g. asset decommissioned)                | Manual: "Cancel"                   |

`overdue` is computed at render time (not stored), so it always reflects current state without nightly jobs.

---

## 3. UX / UI

### 3.1 `/compliance` — register list

Header: "Compliance" + primary action "Add Item" (top right) for trust-level obligations.

Filter row (sticky on scroll desktop, bottom-sheet mobile):

- **Search** — name, linked asset, supplier (when supplier exists)
- **Status chips** — All / Active / Overdue / Due Soon / Awaiting Approval / Completed / Cancelled
- **Linked-to chips** — All / Asset-linked / Trust-level
- **Owner / Type** — chip set built from `compliance_types` (Inspection, Service, Renewal, Audit, Filing, Review)

Default sort: `next_due ASC NULLS LAST`. Status badge colour follows the v1.0 pattern (green/amber/red/grey, same logic as Assets and Documents).

#### Desktop table columns

| # | Column           | Notes                                                                   |
|---|------------------|-------------------------------------------------------------------------|
| 1 | Title + icon     | Compliance type icon (lucide), e.g. `ShieldCheck` for inspections       |
| 2 | Linked to        | Asset name with link, or "Trust-level"                                  |
| 3 | Type             | `compliance_types.name`                                                 |
| 4 | Next due         | Short date + status badge                                               |
| 5 | Status           | Lifecycle stage badge (Pending / Quoting / Approved / Scheduled / etc.) |
| 6 | Last completed   | Short date or "—"                                                       |
| 7 | Actions          | Quick context-aware action button — see §3.2                            |

#### Mobile

Card-per-item layout. Title, linked-to, status badge, next-due. Tap → detail.

### 3.2 Context-aware "next action" button

Each row's primary action depends on `status`. This collapses a multi-step workflow into one obvious next move:

| Status              | Button label              | Action                                            |
| ------------------- | ------------------------- | ------------------------------------------------- |
| `pending`           | Start quoting             | → `quoting`                                       |
| `quoting`           | Request approval          | → `awaiting_approval` (requires a linked quote)   |
| `awaiting_approval` | Record approval           | Opens approval-recording modal — see §3.4         |
| `approved`          | Schedule                  | Opens schedule modal (date + supplier note)       |
| `scheduled`         | Mark complete             | Opens completion modal — see §3.5                 |
| `completed`         | View certificate          | Opens linked satisfaction document                |
| `overdue`           | Start quoting             | Same as pending; the badge tells the urgency      |
| `cancelled`         | Reopen                    | → `pending`                                       |

### 3.3 `/compliance/[id]` — detail page

Three sections, two columns on desktop:

**Left (main):**
- **Lifecycle timeline** — chronological strip of status transitions: "Created 2026-01-12 → Quoting 2026-03-04 (by Jane) → Awaiting approval 2026-03-18 → Approved 2026-04-02 (3 trustees, via email)". Each transition is a row in `compliance_events`.
- **Quotes & invoices card** — documents tagged as quotes for this item, with supplier name (when Suppliers ships) and amount
- **Satisfaction document card** — once `completed`, the certificate / report that closes the item

**Right (sidebar):**
- **Identity card** — name, type, recurrence (e.g. "Annual"), owner role
- **Linked-to card** — asset (with link) or "Trust-level"
- **Compliance schedule card** — last completed, next due, lead time to alert
- **Actions panel** — large context-aware button (matches §3.2) plus secondary actions ("Add note", "Cancel item", "Force complete")

### 3.4 Recording an approval

Opens a modal with:

- **Decision** — Approved / Rejected (radio)
- **Approver(s)** — multi-select of users (defaults to "all trustees voted at meeting")
- **Channel** — In-meeting / Email / WhatsApp / In-app (radio)
- **Recorded at** — datetime, defaults to now
- **Notes** — free text (paste WhatsApp screenshot text, email summary, meeting minute reference)
- **Linked meeting** — optional FK to `meetings` table (when Governance module ships; nullable until then)

On save: writes a row to `compliance_approvals` AND advances the item from `awaiting_approval` → `approved` (or `pending` if rejected). Writes a `compliance_events` entry for the timeline.

### 3.5 Recording completion

Opens a modal with:

- **Completed on** — date input, defaults to today
- **Satisfaction document** — file picker (uploads via Document Vault) OR select existing doc linked to this asset/item
- **Cost** — optional currency input
- **Notes** — free text
- **Auto-create next cycle** — checkbox, default ON if `is_recurring`. Pre-fills the next item's `next_due` from `last_completed + interval_days`.

On save:
1. Updates `compliance_items.status = 'completed'`, `last_completed_at = today`, `satisfaction_doc_id = ...`
2. Writes `compliance_events` entry
3. If "auto-create next cycle" checked, inserts a fresh `compliance_items` row in `pending` status

### 3.6 Asset detail page integration

The existing `/assets/[id]` page gets a new "Compliance items" card next to "Linked documents":

```
Compliance items
─────────────────
🟢 Annual Gas Safe service     Next: 12 Mar 2027   [View]
🟡 Biennial efficiency check   Next: 14 Aug 2026   [View]
🔴 5-year flue inspection      Overdue 4d          [View]

[+ Add compliance item]
```

Each row links to the compliance detail. The "Add compliance item" CTA pre-fills the asset link.

---

## 4. API

### 4.1 Server actions — `src/app/actions/compliance.ts`

| Action                          | Description                                                                |
| ------------------------------- | -------------------------------------------------------------------------- |
| `createComplianceItem(data)`    | Insert with `status='pending'`, validate, link to asset or trust           |
| `updateComplianceItem(id, data)`| Update editable metadata (name, interval, lead days, notes)                |
| `transitionStatus(id, target)`  | Single entry point for all lifecycle moves; validates legal transitions    |
| `recordApproval(id, payload)`   | Write to `compliance_approvals` + advance status; payload from §3.4 modal  |
| `recordCompletion(id, payload)` | Mark complete, link satisfaction doc, optionally create next cycle (§3.5)  |
| `cancelComplianceItem(id, why)` | Set status to `cancelled` with a reason note                               |
| `reopenComplianceItem(id)`      | Reverse a cancellation — set to `pending`                                  |
| `addComplianceEvent(id, ev)`    | Internal helper used by the above actions; records timeline entries        |
| `listComplianceForCurrentOrg()` | Server-side fetch for the register page                                    |
| `listComplianceForAsset(id)`    | Used by the asset detail "Compliance items" card                           |

All return `Promise<{ success: true; data?: T } | { success: false; error: string }>`.

### 4.2 API route — `GET /api/compliance`

Used by the future Notifications module to compute upcoming-due lists. Returns active items only, sorted by `next_due ASC`. Same shape as the register table query.

### 4.3 Status transition rules

`transitionStatus` enforces a state machine — illegal moves return an error. Allowed transitions:

```
pending           → quoting | cancelled | scheduled (skip-quoting fast path)
quoting           → awaiting_approval | pending (back out) | cancelled
awaiting_approval → approved | pending (rejected) | cancelled
approved          → scheduled | pending (back out) | cancelled
scheduled         → completed | approved (rebooked) | cancelled
completed         → completed (no-op) [terminal under normal flow]
cancelled         → pending (reopen)
overdue           [computed; no direct transitions]
```

A "skip-quoting fast path" (`pending → scheduled`) covers cases where the trust has a fixed annual contractor and no quoting cycle is needed.

---

## 5. Database

### 5.1 New tables

```sql
-- compliance_types — what kind of obligation (Inspection, Service, Renewal, etc.)
CREATE TABLE IF NOT EXISTS compliance_types (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text        NOT NULL,
  default_lead_days integer   NOT NULL DEFAULT 60,  -- alert this many days before due
  default_interval_days integer,                    -- if recurring; null = one-off
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- compliance_items — the obligations themselves
CREATE TABLE IF NOT EXISTS compliance_items (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id     uuid        NOT NULL REFERENCES organisations(id)   ON DELETE CASCADE,
  asset_id            uuid                 REFERENCES assets(id)          ON DELETE CASCADE,
  compliance_type_id  uuid                 REFERENCES compliance_types(id) ON DELETE SET NULL,

  name                text        NOT NULL,           -- e.g. "Annual Gas Safe Service"
  description         text,
  is_recurring        boolean     NOT NULL DEFAULT false,
  interval_days       integer,                        -- if recurring; null = one-off
  lead_days           integer     NOT NULL DEFAULT 60,-- alert this many days before next_due

  status              text        NOT NULL DEFAULT 'pending',  -- see §2.1 enum
  next_due            date,                           -- when the obligation must be met by
  last_completed_at   date,
  cost_cents          integer,                        -- last known cost (£ × 100)

  satisfaction_doc_id uuid                 REFERENCES documents(id) ON DELETE SET NULL,

  -- Forward-compatible nullable FKs to entities that ship in later features
  contractor_id       uuid,                           -- → contractors (Suppliers feature)
  meeting_id          uuid,                           -- → meetings (Governance feature)

  cancelled_at        timestamptz,
  cancelled_reason    text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compliance_items_org_idx       ON compliance_items (organisation_id);
CREATE INDEX IF NOT EXISTS compliance_items_asset_idx     ON compliance_items (asset_id);
CREATE INDEX IF NOT EXISTS compliance_items_status_idx    ON compliance_items (status);
CREATE INDEX IF NOT EXISTS compliance_items_due_idx       ON compliance_items (next_due);
CREATE INDEX IF NOT EXISTS compliance_items_active_due_idx
  ON compliance_items (organisation_id, next_due)
  WHERE status NOT IN ('completed', 'cancelled');  -- partial index for the hot register query

-- compliance_approvals — paper trail of who approved what, when, how
CREATE TABLE IF NOT EXISTS compliance_approvals (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  compliance_item_id  uuid        NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
  decision            text        NOT NULL,              -- 'approved' | 'rejected'
  channel             text        NOT NULL,              -- 'meeting' | 'email' | 'whatsapp' | 'in_app'
  recorded_at         timestamptz NOT NULL DEFAULT now(),
  recorded_by         uuid                 REFERENCES users(id) ON DELETE SET NULL,
  approver_user_ids   uuid[]      NOT NULL DEFAULT '{}', -- array of user ids who approved
  notes               text,                              -- WhatsApp screenshot text, email summary, etc.
  meeting_id          uuid,                              -- → meetings (Governance feature, nullable)
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compliance_approvals_item_idx ON compliance_approvals (compliance_item_id);

-- compliance_events — append-only timeline (created, transitioned, noted, etc.)
CREATE TABLE IF NOT EXISTS compliance_events (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  compliance_item_id  uuid        NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
  event_type          text        NOT NULL,
  -- 'created' | 'status_changed' | 'noted' | 'document_linked' | 'rescheduled' | 'reopened'
  from_status         text,
  to_status           text,
  payload             jsonb       NOT NULL DEFAULT '{}',
  -- documented shape per event_type — see §5.3
  recorded_by         uuid                 REFERENCES users(id) ON DELETE SET NULL,
  recorded_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compliance_events_item_idx ON compliance_events (compliance_item_id, recorded_at DESC);
```

### 5.2 Document Vault forward-compatibility

The Document Vault v1.0 spec already noted that `compliance_item_id` would be added in v1.1+ as a nullable FK. This is the moment.

```sql
-- 20260429_link_documents_to_compliance.sql
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS compliance_item_id uuid REFERENCES compliance_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS documents_compliance_idx ON documents (compliance_item_id);
```

When a document is uploaded as a quote or certificate against a compliance item, this FK links them.

### 5.3 JSONB payload contracts

Each `compliance_events.event_type` has a documented payload shape. Validate before write.

```typescript
type ComplianceEventPayload =
  | { type: 'created' }
  | { type: 'status_changed'; reason?: string }
  | { type: 'noted'; note: string }
  | { type: 'document_linked'; documentId: string; role: 'quote' | 'satisfaction' | 'other' }
  | { type: 'rescheduled'; from: string; to: string }            // ISO dates
  | { type: 'reopened' };
```

### 5.4 Migrations

- `20260429_add_compliance_register.sql` — the four new tables (compliance_types, compliance_items, compliance_approvals, compliance_events) + indexes
- `20260429_link_documents_to_compliance.sql` — adds `documents.compliance_item_id`
- `20260429_seed_compliance_types.sql` — default types (Inspection, Service, Renewal, Audit, Filing, Review, Insurance Renewal, Policy Review)

### 5.5 Drizzle schema files

- New: `src/db/schema/compliance_types.ts`, `compliance_items.ts`, `compliance_approvals.ts`, `compliance_events.ts`
- Update: `src/db/schema/documents.ts` to add the new FK
- Export from `src/db/schema/index.ts`

---

## 6. Validation

### 6.1 Client-side

- Name: required, max 200
- Type: required (must be from `compliance_types`)
- Either `asset_id` OR no asset (trust-level) — never both styles
- `interval_days`: required if `is_recurring=true`, must be ≥ 1
- `lead_days`: 0–365 inclusive
- `next_due`: required for `pending` items; optional thereafter (can be set when scheduling)

### 6.2 Server-side

```typescript
if (!name?.trim() || name.trim().length > 200) return { success: false, error: 'Name is required and under 200 chars.' };
if (!complianceTypeId || !await complianceTypeExists(complianceTypeId)) return { success: false, error: 'Invalid type.' };
if (assetId && !await assetBelongsToCurrentOrg(assetId)) return { success: false, error: 'Linked asset not found.' };
if (isRecurring && (!intervalDays || intervalDays < 1)) return { success: false, error: 'Recurring items need a valid interval.' };
if (leadDays != null && (leadDays < 0 || leadDays > 365)) return { success: false, error: 'Lead days must be 0–365.' };
```

### 6.3 Transition validation

`transitionStatus(id, target)` checks the state machine in §4.3 and returns `{ success: false, error: 'Cannot move from {from} to {to}' }` for illegal moves.

Special-case checks:
- `pending → awaiting_approval` requires a linked quote document (rejected if none)
- `awaiting_approval → approved` requires a `compliance_approvals` row written first (the modal handles this atomically)
- `scheduled → completed` requires a satisfaction document (rejected if none, or modal forces upload first)

---

## 7. Error Handling

- `loading.tsx` — skeleton table on `/compliance`, skeleton card on `/compliance/[id]`
- `error.tsx` — "Could not load compliance register. Please refresh." + retry
- `not-found.tsx` on detail page — "Compliance item not found or has been deleted"
- Empty state on register: "No compliance items yet. Add your first obligation to start tracking renewals." + "Add Item" CTA
- Server action errors surface inline with `role="alert"`
- Illegal transitions return human-readable errors (`"Items must be approved before scheduling"`)
- Recording an approval without a recorded approver list returns: `"Please select at least one approving trustee."`

---

## 8. Accessibility

- Single `<h1>Compliance</h1>` per page
- Lifecycle timeline is a `<ol>` with `aria-label="Lifecycle history"`
- Status badges include screen-reader context: `<span className="sr-only">Status: </span>Awaiting approval`
- Approval modal: focus trap, ESC to close, focus returns to action button
- Date inputs use native `<input type="date">`
- Status transition buttons have `aria-label` describing the destination state ("Move to scheduled")
- Touch targets ≥ 44 × 44 px on mobile per design system

---

## 9. Security

- All `/compliance` routes covered by `isAppHost` → `auth.protect()` middleware ✓
- Server actions use `resolveCurrentUser()` → `can(clerkId, Permission.ManageCompliance | ApproveCompliance | ViewCompliance)`
- Multi-tenancy: every query scoped by `organisation_id` from membership; never accept it from client
- **Approval integrity**: `recordApproval` writes the `recorded_by` from `resolveCurrentUser()` — the client cannot forge "I approved" entries. The `approver_user_ids` array (who approved) IS client-provided but the `recorded_by` (who entered the record) is server-resolved. Audit log is preserved.
- **Cross-org leakage**: linked asset, satisfaction doc, and contractor IDs all checked to belong to the current org before write
- Cancellation reason free-text: trimmed and length-limited (max 1000 chars) before write
- Server action error messages are generic to clients; full errors logged via `console.error('[complianceAction]', err)`
- The `approver_user_ids` array is a postgres `uuid[]` — validated to contain only ids of users with active membership in the same org

---

## 10. Performance

- `/compliance` is a server component; initial load fetches first 100 active items sorted by `next_due ASC NULLS LAST`
- Cursor-based pagination for orgs with > 100 items (rare for a single village hall)
- Partial index `compliance_items_active_due_idx` excludes completed/cancelled rows from the hot path
- `compliance_events` is append-only and only loaded on the detail page — no impact on register query
- Status transitions are single-row updates + 1–2 events inserts; no blocking joins
- The "next action" button per row is computed client-side from `status`, no server roundtrip
- Asset detail's "Compliance items" card limited to 10 most recent items (full list lives at `/compliance?asset=...`)

---

## 11. Testing

### 11.1 Required tests

- `createComplianceItem`: valid → row inserted; missing name → fail; invalid asset (cross-org) → fail; recurring without interval → fail
- `transitionStatus`:
  - pending → quoting: succeeds
  - pending → completed: rejected (must approve first)
  - quoting → awaiting_approval without quote doc: rejected
  - awaiting_approval → approved without approval row: rejected
  - completed → completed: no-op success
- `recordApproval`: writes both `compliance_approvals` AND advances status to `approved`; `recorded_by` matches authenticated user
- `recordCompletion`: with `auto-create next cycle` true and `is_recurring` true → next item created with correct `next_due`
- `cancelComplianceItem`: writes cancelled_at, cancelled_reason; status → cancelled
- `reopenComplianceItem`: cancelled → pending; new event recorded
- `GET /api/compliance`: returns only authenticated user's organisation; `next_due` filter honoured
- Documents linkage: setting `documents.compliance_item_id` on upload appears in the item's "Quotes & invoices" or "Satisfaction" card

### 11.2 Manual verification

- Create a "Annual Gas Safe Service" item linked to the boiler asset → appears in register and on `/assets/[id]` Compliance card
- Run the full lifecycle: pending → quoting → upload quote → awaiting_approval → record approval → scheduled → mark complete → next cycle auto-created
- Record an approval via WhatsApp channel with notes "John, Jane, Mark approved via group chat 2026-04-15" — appears in timeline
- Cancel a one-off item ("not applicable any more") → moves to cancelled section, can be reopened
- Mobile: filter sheet works, action button collapses cleanly, timeline scrolls

---

## 12. Pre-implementation blockers

1. **No Suppliers module yet.** The schema reserves `contractor_id` as a nullable FK to a non-existent `contractors` table. For v1.0:
   - Don't enforce the FK constraint (column is nullable text-or-uuid for now, FK added in the Suppliers feature)
   - The "Schedule" modal accepts free-text supplier name only; once Suppliers ships, it becomes a typeahead
2. **No Notifications module yet.** Compliance items have a `lead_days` field but nothing reads it for alerts. v1.0 ships the data; alerts come with the Notifications feature. Consider a temporary "Items due soon" widget on the dashboard as an interim visibility mechanism.
3. **No Governance / Meetings yet.** `meeting_id` is nullable on both `compliance_items` and `compliance_approvals`. v1.0 stores approval channel + notes (free text). When the Governance module ships, we backfill nothing — meeting_id stays null on historical approvals.
4. **Document Vault v1.x linkage** — adding `documents.compliance_item_id` is a small migration; verify Document Vault is still on v1.2 or higher when this lands. The upload modal will need a small enhancement to optionally tag a doc as a quote/certificate against a specific compliance item — this is a v1.1 enhancement to Document Vault.
5. **RBAC: who can approve?** Confirmed 2026-04-28 — `trust_admin` and `trustee` roles hold the `ApproveCompliance` permission. The `approver_user_ids` UI control filters to users with this permission. **Forward note:** the trust is on a likely trajectory to a Charitable Incorporated Organisation (CIO) which formalises governance — see §13.1.

---

## 13. Forward considerations and out of scope

### 13.1 CIO governance / formal voting (planned v2 enhancement)

The trust expects to convert to a **Charitable Incorporated Organisation (CIO)** in the future. CIOs operate under a formal governance constitution typically requiring:

- A defined number of trustees (commonly 5–7, including a Chair)
- A **quorum** (minimum trustees who must vote for a decision to be valid — usually a majority of trustee count)
- A **decision threshold** (simple majority, super-majority, or unanimous depending on the constitution and decision type)
- A **Chair's casting vote** in the case of a tie
- An **auditable per-trustee vote record** for each decision (yes / no / abstain), not merely a "these people approved" list

The v1.0 schema records approvals as a flat `uuid[]` of approver user ids — sufficient for a small unincorporated trust where "three trustees said yes via WhatsApp" is enough audit. It is **not** sufficient for CIO compliance.

**Upgrade path when the trust becomes a CIO:**

1. Add a per-vote table:

   ```sql
   CREATE TABLE compliance_votes (
     id                     uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
     compliance_approval_id uuid NOT NULL REFERENCES compliance_approvals(id) ON DELETE CASCADE,
     trustee_user_id        uuid NOT NULL REFERENCES users(id),
     vote                   text NOT NULL,  -- 'yes' | 'no' | 'abstain'
     is_chair_casting       boolean NOT NULL DEFAULT false,
     cast_at                timestamptz NOT NULL DEFAULT now(),
     channel                text NOT NULL,
     notes                  text
   );
   ```

2. Add `organisations.governance_model` (`'unincorporated'` | `'cio'`) and per-decision-type quorum/threshold settings on a new `governance_rules` table.
3. Backfill: existing `compliance_approvals.approver_user_ids` become `compliance_votes` rows with `vote = 'yes'`.
4. The approval modal gains a per-trustee vote grid (yes/no/abstain) with running tally and an automatic quorum/threshold check before the approval can be finalised.

This is captured here so the v1.0 schema does not paint the project into a corner. The flat `approver_user_ids` array forward-migrates cleanly into per-trustee `compliance_votes` rows without data loss.

### 13.2 Out of scope (v1.0)



These are explicitly **not** in v1.0 of Compliance Register — they live in their own future feature docs:

- **Notifications** — alerting trustees of upcoming/overdue items (email, in-app, push, SMS, WhatsApp)
- **Supplier Communications** — outbound emails/messages to contractors for quoting and booking
- **Suppliers / Contractors register** — the contact directory itself
- **Governance / Meetings / Decisions** — the meeting record where approvals happen sync
- **Recurring item bulk-creation** — UI to bulk-add a year's worth of recurring obligations from templates (manual creation per item in v1.0)
- **Cost reporting / budgeting** — the `cost_cents` field is captured but no aggregation views ship in v1.0
- **Public auditor view** — read-only export for charity auditors (covered later by the Exports module per scope build order #12)

---

## Changelog

| Version | Date       | Change                                                                                                                                                                                                                                                                                          |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0    | 2026-04-28 | Initial spec — `compliance_items` table with full lifecycle (pending → completed), `compliance_approvals` for audit trail, `compliance_events` for timeline, partial index for hot path, asset detail integration, document linkage. Forward-compatible nullable FKs to Suppliers and Meetings. |
| v1.1    | 2026-04-28 | RBAC confirmed (`trust_admin` + `trustee` hold `ApproveCompliance`). Added §13.1 documenting the **CIO governance / formal voting** trajectory — when the trust converts to a Charitable Incorporated Organisation, the flat `approver_user_ids` array upgrades cleanly to a `compliance_votes` per-trustee table with quorum and threshold rules. v1.0 schema explicitly designed to forward-migrate without data loss. |
