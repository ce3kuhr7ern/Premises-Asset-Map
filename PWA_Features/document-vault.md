# Feature: Document Vault

**Version:** v1.4
**Status:** v1.0 shipped 2026-04-27. v1.1–v1.3 shipped 2026-04-27 / 2026-04-28. v1.4 (role-aware uploads from compliance, §16) — planned Phase 1.
**Routes:**

- `/documents` — list / search / filter
- `/documents/[id]` — single document detail (preview + metadata)
- (Asset detail page wires the existing "Linked documents" placeholder to this module)

**Surface:** Web application — back-office.

---

## 1. Purpose

Every compliance step in the trust ends with a document — a CD11 from the boiler service, an electrical EICR, the public liability certificate, the safeguarding policy. Today there is no system to store these. Documents live in inboxes, USB drives, or printed binders.

The Document Vault is the canonical store. Every certificate, policy, lease, insurance schedule, and inspection report lives here, linked optionally to an asset and (later, in v1.1) to a compliance item. It is the proof layer for the Compliance Register module.

Files live in **Vercel Blob**. The decision is recorded in this doc and in `tech-decisions.md`. R2 is a future swap-in if usage outgrows the Vercel free tier — file paths in `documents.file_url` are storage-agnostic.

---

## 2. UX / UI

### 2.1 `/documents` — Vault page

Header: "Documents" with primary action "Upload Document" (top right).

Filter row (sticky on scroll on desktop, collapsing into a "Filters" sheet on mobile):

- **Search** — free-text against name + notes
- **Type chips** — multi-select, populated from `document_types` (Certificate, Policy, Insurance, Governance, Operational, …)
- **Linked-to filter** — All / Linked to asset / Standalone (trust-level)
- **Status filter** — All / Active / Expiring soon (≤ 30 days) / Expired

Default sort: `expires_at ASC NULLS LAST` so the next thing to renew is at the top. Secondary sort by `uploaded_at DESC`.

#### Desktop table columns

| # | Column | Notes |
|---|---|---|
| 1 | File icon + Name | Mime-type icon (PDF / image / generic). Click opens detail. |
| 2 | Type | `document_types.name` |
| 3 | Linked to | Either an asset name (with link) or "Trust-level" |
| 4 | Uploaded | `created_at`, short date |
| 5 | Expires | `expires_at` if set, with status badge (green/amber/red, same logic as assets) |
| 6 | Size | Humanised (e.g. "1.2 MB") |
| 7 | Actions | Download, Edit metadata, Delete |

#### Mobile

Card-per-doc: file icon, name, type, expires badge, "linked to" tag. Tap → detail.

### 2.2 Upload flow

A modal opened from the page header (consistent with the existing app modals). Fields:

- **File** (required) — drag-and-drop area or file picker. Single file at a time in v1.0; bulk upload deferred to v1.1.
- **Name** (text, required, max 200) — pre-filled from filename, editable
- **Document type** (select, required) — populated from `document_types`
- **Linked asset** (typeahead, optional) — searches `assets` for the current org. Empty = trust-level document.
- **Expires on** (date, optional) — for certificates and renewals
- **Notes** (textarea, optional)

Upload happens in two phases:

1. Client requests an upload URL from a server action (`getDocumentUploadUrl`). The server validates the file size and mime type against the allowlist before issuing a Vercel Blob client-token.
2. Client uploads the file directly to Blob using `@vercel/blob/client.upload()`. On success, the client calls `createDocument(metadata, blobUrl)` to insert the row.

This pattern keeps the server free of large file streams and stays inside Next.js's 4.5 MB request body limit.

### 2.3 Detail page `/documents/[id]`

Two-column on desktop, stacked on mobile.

**Header bar:** back link, document name, status badge (if expiring), action buttons (Download, Edit metadata, Delete).

**Left column — preview:**

- PDFs: inline `<iframe>` embed
- Images (jpg/png/webp/gif): `<Image>` with `object-contain`
- Anything else: file icon + "Download to view" CTA

**Right column — metadata:**

- Identity card — name, type, file size, mime type, original filename
- Lifecycle card — uploaded by, uploaded at, expires at (computed days remaining)
- Linked-to card — asset (with link) or "Trust-level"
- Notes card

### 2.4 Asset detail integration

The existing "Linked documents" placeholder on `/assets/[id]` becomes a real card listing documents where `documents.asset_id = asset.id`. Each row: name, type, expires badge, "Download" link. Empty state: "No documents linked yet." with an "Upload" CTA that opens the upload modal pre-filled with `assetId`.

---

## 3. API

### 3.1 Server actions — `src/app/actions/documents.ts`

| Action | Description |
|---|---|
| `getDocumentUploadUrl({ filename, mimeType, fileSize })` | Validates against allowlists, returns a Vercel Blob client-upload token plus the eventual public URL. |
| `createDocument(metadata, blobUrl)` | Inserts the `documents` row after the client confirms the upload. |
| `updateDocument(id, metadata)` | Update name, type, asset link, expires, notes — does not replace the file. |
| `deleteDocument(id)` | Deletes the row AND the Blob file (best-effort — log on failure but always succeed locally to avoid orphan rows). |

All return `Promise<{ success: true; data?: T } | { success: false; error: string }>`.

### 3.2 API route — `GET /api/documents`

For the typeahead asset linker on the upload form and any future client-side searches.

Query params: `q`, `typeId`, `assetId`, `linkedTo` (`asset` / `standalone` / `all`), `status` (`active` / `expiring_soon` / `expired`), `limit`, `cursor`.

Response: `{ success: true, data: DocumentSummary[], nextCursor: string | null }`.

`DocumentSummary`:

```typescript
{
  id: string;
  name: string;
  docTypeName: string | null;
  mimeType: string;
  fileSize: number;
  expiresAt: string | null;
  assetId: string | null;
  assetName: string | null;
  uploadedAt: string;
}
```

### 3.3 Vercel Blob integration

```typescript
// .env.local — already in Vercel dashboard for prod, copy to local for dev
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Client-side upload using `@vercel/blob/client.upload()` so the file streams direct from browser to Blob storage. Server actions never touch the file body.

Path convention: `documents/{organisationId}/{documentId}-{slugifiedName}.{ext}`. The `documentId` UUID is generated server-side at the start of the upload flow so the client knows where to put the file before the row is committed.

---

## 4. Database

### 4.1 New table — `documents`

```sql
CREATE TABLE IF NOT EXISTS documents (
  id                uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id   uuid        NOT NULL REFERENCES organisations(id)   ON DELETE CASCADE,
  asset_id          uuid                 REFERENCES assets(id)          ON DELETE SET NULL,
  doc_type_id       uuid                 REFERENCES document_types(id)  ON DELETE SET NULL,

  name              text        NOT NULL,
  filename          text        NOT NULL,    -- original on-disk filename for download
  mime_type         text        NOT NULL,
  file_size         integer     NOT NULL,    -- bytes
  file_url          text        NOT NULL,    -- absolute Vercel Blob URL

  expires_at        date,
  notes             text,

  uploaded_by       uuid                 REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_org_idx        ON documents (organisation_id);
CREATE INDEX IF NOT EXISTS documents_asset_idx      ON documents (asset_id);
CREATE INDEX IF NOT EXISTS documents_type_idx       ON documents (doc_type_id);
CREATE INDEX IF NOT EXISTS documents_expires_idx    ON documents (expires_at);
```

`compliance_item_id` is intentionally omitted — added in v1.1 once the Compliance Register table exists.

### 4.2 Seed `document_types`

```sql
INSERT INTO document_types (name) VALUES
  ('Certificate'),
  ('Policy'),
  ('Insurance'),
  ('Governance'),
  ('Inspection Report'),
  ('Risk Assessment'),
  ('Lease / Property'),
  ('Operational')
ON CONFLICT DO NOTHING;
```

### 4.3 Migrations

- `20260428_add_documents_table.sql` — create `documents` + indexes
- `20260428_seed_document_types.sql` — seed default types (separate file because it's a data concern, not schema)

### 4.4 Drizzle

- New: `src/db/schema/documents.ts`
- Export from `src/db/schema/index.ts`
- Use `InferSelectModel<typeof documents>` everywhere

---

## 5. Validation

### 5.1 File constraints

- **Max size:** 25 MB (Vercel Blob accepts up to 5 GB, but 25 MB is a sensible UI ceiling for compliance docs)
- **Allowed mime types** (allowlist, enforced server-side):
  - `application/pdf`
  - `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`
  - `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (doc, docx)
  - `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xls, xlsx)
- **Rejected:** executables, archives, scripts, anything not on the allowlist — return 400 from `getDocumentUploadUrl`

### 5.2 Server-side metadata validation

```typescript
if (!name?.trim() || name.trim().length > 200) return { success: false, error: 'Name is required and must be under 200 characters.' };
if (!docTypeId || !await docTypeExists(docTypeId)) return { success: false, error: 'Invalid document type.' };
if (assetId && !await assetBelongsToCurrentOrg(assetId)) return { success: false, error: 'Invalid linked asset.' };
if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) return { success: false, error: 'Invalid expiry date.' };
if (notes && notes.length > 5000) return { success: false, error: 'Notes too long.' };
```

---

## 6. Error Handling

- `loading.tsx` — skeleton table rows on `/documents`, skeleton card on `/documents/[id]`
- `error.tsx` — "Could not load documents. Please refresh." with retry button
- `not-found.tsx` on `/documents/[id]` — "Document not found or has been deleted."
- Empty state on vault: "No documents yet. Upload your first certificate or policy to start building the register."
- Upload errors surface inline in the modal with `role="alert"`:
  - File too large → "Files must be under 25 MB."
  - Mime type rejected → "We can't accept that file type. Please upload a PDF, image, or Office document."
  - Network failure mid-upload → "Upload failed. Please try again." (no partial rows committed because `createDocument` runs only after Blob success)
  - Blob 5xx → same message, log to server console
- Delete failures: row is removed locally; if Blob delete fails, log and continue (don't expose to user — orphan files cleaned up by a future maintenance job)

---

## 7. Accessibility

- Single `<h1>Documents</h1>` per page
- File picker uses native `<input type="file">` with a labelled drop zone wrapper
- Drop zone keyboard-accessible: focusable, "click to browse" on Enter/Space
- Upload progress announced via `aria-live="polite"`
- Document type and linked-asset selects have visible `<label>`s
- Status badges include `<span className="sr-only">Status: </span>` for SR clarity
- Touch targets ≥ 44×44px on mobile per design system

---

## 8. Security

- All `/documents` routes covered by `isAppHost` → `auth.protect()` middleware ✓
- Server actions resolve current user via `resolveCurrentUser()` → `can(clerkId, Permission.UploadDocument | ViewDocument | DeleteDocument)`
- **Multi-tenancy:** every query scoped by `organisation_id` from the user's membership; never accept `organisationId` from the client
- **Asset link integrity:** `assetId` provided by the client must belong to the current org — checked before the doc row is committed
- **File access control:** Vercel Blob URLs are public-but-unguessable. For v1.0 this is acceptable for charity-scale use. v1.1 (when the Compliance Register ships) will add signed URLs with short TTLs for sensitive docs (e.g. risk assessments naming individuals)
- **Mime type spoofing:** validate `mimeType` server-side from the client claim AND check the response from Blob's metadata before persisting. Reject mismatches.
- Uploaded filenames sanitised (slugify, strip path separators) before forming the Blob path
- Server action errors stay generic; full error logged with `console.error('[documentAction]', err)`
- Soft-delete is NOT used here — when a document is removed, the file goes too. The compliance trail is preserved on the linked compliance item (later) via its own history.

---

## 9. Performance

- `/documents` is a server component; initial load fetches first 50 rows sorted by `expires_at ASC NULLS LAST`
- Cursor-based pagination for >50 rows. No `OFFSET`.
- Filter changes use URL search params + `revalidatePath` — keeps the page server-rendered
- `/documents/[id]` is a server component; PDF preview uses native `<iframe>` (no client-side PDF.js, no extra bundle)
- Indexes on `(organisation_id, expires_at)`, `(asset_id)`, `(doc_type_id)` cover all query paths
- Client-side direct-to-Blob upload — server never sees the file body, no impact on Next.js serverless function memory

---

## 10. Testing

### 10.1 Required tests

- `getDocumentUploadUrl`: rejects oversize files; rejects disallowed mime types; rejects unauthenticated
- `createDocument`: valid metadata + valid Blob URL → row inserted; missing fields → fail; cross-org assetId → fail
- `updateDocument`: changing assetId to one in another org → fail; valid → row updated
- `deleteDocument`: row removed; Blob delete attempted (mock); orphaned Blob if delete fails does not break the action
- `GET /api/documents`: returns only the user's organisation; type / linked-to / status filters work; cursor pagination works
- File access: hitting a Blob URL of a deleted document returns 404 (Vercel Blob behaviour, not ours to test, but document the expectation)

### 10.2 Manual verification

- Upload a 1MB PDF → row appears in vault, file downloads correctly, preview renders inline
- Upload a 30MB file → rejected client-side and server-side
- Upload a `.exe` → rejected by mime allowlist
- Link a doc to an asset → appears in the asset's "Linked documents" card
- Delete a doc → vanishes from list AND from the asset detail page
- Mobile: upload works on iPhone Safari; PDF preview falls back to download (iframe support is patchy)

---

## 11. Pre-implementation blockers

1. **Vercel Blob token** — need `BLOB_READ_WRITE_TOKEN` set in:
   - Vercel dashboard for production and preview environments
   - `.env.local` for local dev
   Action: enable Blob in Vercel project, generate token, copy to local env.
2. **Mobile Safari PDF preview** — iframes embedding PDFs do not render reliably on iOS Safari. Acceptable v1.0 fallback: detect iOS user agent and show a "Open PDF" button instead of the iframe. PDF.js fallback can be a v1.1 enhancement if needed.
3. **`document_types` is empty** — must run the seed migration before any UI is functional, or the Type select shows zero options.
4. **No compliance_item_id yet** — documents linked to compliance items has to wait for the Compliance Register feature. v1.0 supports asset-linked + trust-level only. The schema is forward-compatible (FK added in v1.1 as a nullable column).
5. **(v1.1) `ANTHROPIC_API_KEY`** — required for the AI auto-categorisation in §13. Set in Vercel dashboard (production + preview) and `.env.local`. Without it, the upload modal still works but the AI-suggest path is disabled (graceful degrade — see §13.7).

---

## 13. AI Auto-Categorisation (v1.1 enhancement)

### 13.1 Purpose

Trustees and hall managers upload a wide variety of files — HM Land Registry titles, CD11 certificates, public liability schedules, safeguarding policies. Each one needs a sensible **name**, the right **document type**, and (where relevant) an **expiry date**. Filling those in manually is friction at the moment of upload — exactly when the user just wants to be done.

This enhancement reads the document with an LLM and pre-fills the form. The user reviews, edits, and confirms. Save rate goes up; data quality goes up; time-to-upload goes down.

### 13.2 UX integration

Wires into the existing `DocumentUploadModal`. No new screens.

```
1. User picks/drops a file              (existing)
2. Client kicks off TWO parallel jobs:
     A) Upload file to Vercel Blob      (existing)
     B) Send file to AI for suggestions (NEW — see §13.4)
3. While both run, the modal shows:
     - Filename and size                (existing)
     - "AI is reading the document…"    (NEW, with subtle spinner)
4. When job B completes, the form fields auto-fill:
     - Name                              (suggested, editable)
     - Type                              (preselected, editable)
     - Expires on                        (filled if found, editable)
     - A small "AI suggestion" pill next to each filled field
5. User reviews — accepts as-is, edits, or wipes — and clicks Upload.
6. createDocument() runs as today. The fact that values came from AI is
   recorded in documents.ai_suggested = true (§13.10) for future analysis.
```

If the user starts editing fields before the AI returns, the AI suggestion is **discarded silently** — never overwrite human input.

If the AI returns suggestions with `confidence < 0.6`, fields are left blank but a soft message appears: *"AI couldn't confidently classify this — please fill in manually."* This avoids polluting good-faith uploads with bad guesses.

A small "Re-run AI" link near the form re-issues the suggestion call (rare path — useful for the corner case where the first call timed out).

### 13.3 Model and cost

| Model                    | Cost per typical doc (2-3 page PDF) | Native PDF? | Recommendation |
| ------------------------ | ------------------------------------ | ----------- | -------------- |
| **Claude Haiku 4.5**     | ~$0.004                              | ✅ Yes       | **Selected**   |
| GPT-4o-mini              | ~$0.001                              | ❌ No (image only) | Rejected — adds PDF→image conversion step |
| GPT-4.1-nano             | ~$0.0004                             | ❌ No        | Rejected — same reason as above |
| OCR + tiny LLM           | ~$0.0001                             | n/a         | Rejected — moving parts, OCR quality varies |

**Why Haiku 4.5:** native PDF input means no server-side PDF→image rendering. That's not a cost question — it's a code-complexity and serverless-runtime question. Haiku also returns structured output reliably via tool use. Total run cost for a typical village hall (≈100 docs/year) projects to ~£0.30/year. Effectively free.

Model ID: `claude-haiku-4-5` (as of 2026-04). Pin in env var `ANTHROPIC_MODEL` so it can be swapped without a code change.

### 13.4 Server action — `suggestDocumentMetadata`

Lives in `src/app/actions/documents.ts`.

```typescript
export interface SuggestionResult {
  suggestedName:     string;
  suggestedDocTypeId: string | null;   // null if no confident match
  suggestedExpiry:   string | null;    // ISO date or null
  confidence:        number;           // 0–1
  reasoning:         string;           // for debug / future audit log
}

export async function suggestDocumentMetadata(input: {
  blobUrl: string;
  mimeType: string;
}): Promise<{ success: true; data: SuggestionResult } | { success: false; error: string }>
```

Internal flow:

1. Auth: `resolveCurrentUser()` → check `Permission.UploadDocument`
2. Validate mime type — only `application/pdf` and `image/*` supported in v1.1; Office docs return `{ success: false, error: 'AI suggestions not available for this file type' }`
3. Fetch the blob (it's public-but-unguessable — the upload just completed). Read into a `Buffer`. Hard cap fetch size at 32 MB (Anthropic's limit) — if larger, return `{ success: false, error: 'File too large for AI suggestion' }`
4. Look up the org's active `document_types` → pass the names into the prompt
5. Build the Anthropic request (see §13.5 + §13.6)
6. Call `anthropic.messages.create(...)` with `tool_choice: { type: 'tool', name: 'categorise_document' }` to force structured output
7. Extract the tool input from the response
8. Map `suggested_doc_type` (string) → `docTypeId` (UUID) via lookup; if no match, set to null
9. Validate the returned object — clamp `confidence` to 0..1, parse `expires_at` as ISO date or null
10. Return the structured result

Latency target: P95 under 3 seconds for a typical 2-3 page PDF.

If the call fails (network, rate limit, model error), return `{ success: false, error: 'AI suggestion unavailable' }` and let the client fall back to a blank form. Log the full error server-side with `console.error('[suggestDocumentMetadata]', err)`.

### 13.5 Tool / structured output schema

Anthropic's tool use API guarantees JSON shape — no parsing fragility.

```typescript
const tool = {
  name: 'categorise_document',
  description: 'Classify a compliance document and extract key metadata',
  input_schema: {
    type: 'object',
    properties: {
      suggested_name: {
        type: 'string',
        description: 'A concise, human-readable name (max 80 chars). Include the most useful identifier — title number, certificate reference, policy name. Example: "HM Land Registry Title TT123456 — Village Hall"',
      },
      suggested_doc_type: {
        type: 'string',
        enum: docTypeNames,   // dynamically populated from DB
        description: 'The single best matching document type from the provided list',
      },
      suggested_expiry_date: {
        type: ['string', 'null'],
        description: 'ISO 8601 date (YYYY-MM-DD) when this document expires or needs renewal. Null if no expiry date is present in the document.',
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'How confident you are in the classification (0 = guess, 1 = certain)',
      },
      reasoning: {
        type: 'string',
        description: 'Brief explanation of how you classified the document. One sentence.',
      },
    },
    required: ['suggested_name', 'suggested_doc_type', 'confidence', 'reasoning'],
  },
};
```

### 13.6 Prompt design

System prompt (cached — same on every call):

```
You are a document classifier for a UK village hall compliance platform.
Your job is to read uploaded documents (certificates, policies, insurance,
governance, property records) and classify them so trustees can find them
later. Be concise and factual — no speculation.

When extracting expiry dates, look for terms like "valid until", "expires",
"renewal date", "review by", "due date". If multiple dates are present,
choose the one that represents when this specific document becomes invalid
or needs renewing.

Return your classification using the categorise_document tool.
```

User message:

```
The document_types available in this trust are:
{{ list of doc type names, one per line }}

Classify the attached document. If unsure, return a low confidence score
rather than guess.
```

Plus the document itself as a `document` content block (PDF) or `image` content block.

System prompt enables `cache_control: { type: 'ephemeral' }` so the system + tool definition cache across calls — saves ~80% on input tokens at this scale.

### 13.7 Limits and graceful degradation

| Condition                                      | Behaviour                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` missing                    | Server action returns `{ success: false, error }` — modal continues silently   |
| File > 32 MB or > 100 pages (Anthropic limits) | Skip AI, show a hint: *"AI suggestion skipped — file too large"*                |
| Mime type is Office doc                        | Skip AI, show a hint: *"AI suggestion only available for PDFs and images"*      |
| API call times out (>10s)                      | Cancel via `AbortController`, return error, client falls back to blank form    |
| Confidence < 0.6                               | Return suggestions but flag low-confidence; client leaves fields blank         |
| API rate limit hit                             | Server returns generic error; modal silently falls back to manual entry        |
| User edits a field before AI returns           | Discard AI suggestion for that field; never overwrite                          |

The defining principle: **AI is an optional accelerator, never a blocker**. Upload always works without it.

### 13.8 Privacy and data egress

This is the single biggest decision point for the trust admin to be aware of. Document them clearly in user-facing text the first time AI suggestions are enabled.

- Documents sent to Anthropic include sensitive content (Land Registry titles, policy reviews, insurance schedules)
- Anthropic's API does **not** train on customer data by default
- Data is processed in Anthropic's US-region infrastructure (or EU/UK if using a regional endpoint where available)
- For maximum privacy, an admin toggle at the org level can disable AI suggestions entirely:
  - DB column: `organisations.ai_suggestions_enabled boolean NOT NULL DEFAULT true`
  - Surfaced in `/settings/organisation` (future feature)
  - Default ON; admin can switch off without losing other functionality

If the trust deals with personal data sensitive enough that any third-party processing is unacceptable (e.g. safeguarding case files), the admin should disable the toggle. Document this trade-off in the settings page UI.

### 13.9 Performance

- Suggestion job runs **in parallel** with the Blob upload. The user does not wait extra time — the suggestion typically arrives before the upload completes for files > ~2 MB.
- Server action target: P95 < 3 seconds for 2-3 page PDFs; P95 < 5 seconds for 10-page PDFs
- No caching of results — every doc is unique
- System prompt + tool definition cached via Anthropic ephemeral cache (~80% input cost reduction on repeated calls)
- No queueing infrastructure — sync server action is fine at this scale

### 13.10 Database

One small additive change to record provenance.

```sql
-- 20260428_add_documents_ai_columns.sql
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ai_suggested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence real,
  ADD COLUMN IF NOT EXISTS ai_reasoning text;
```

`ai_suggested = true` on rows where the user accepted ANY AI-prefilled field without editing. Used later to measure AI helpfulness and tune prompts. Not surfaced in the UI for v1.1.

Drizzle schema update: add the three columns to `src/db/schema/documents.ts`.

### 13.11 Configuration

Environment variables:

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5      # default if unset
ANTHROPIC_MAX_DOC_BYTES=33554432       # 32 MB cap, default if unset
```

NPM dependency: `@anthropic-ai/sdk` (latest stable).

### 13.12 Testing

Required tests:

- `suggestDocumentMetadata`: rejects unauthenticated; rejects unsupported mime; rejects files > 32 MB; returns shape `{ suggestedName, suggestedDocTypeId, suggestedExpiry, confidence, reasoning }` against a fixture PDF (mocked Anthropic response)
- Mapping: when Claude returns a doc type name not in the org's `document_types`, `suggestedDocTypeId` is null
- Validation: `confidence` clamped to 0..1; invalid `suggestedExpiry` parsed to null
- Graceful degrade: `ANTHROPIC_API_KEY` missing → server action returns clean error, modal still uploads

Manual verification:

- Upload a Land Registry PDF → Type prefilled to "Lease / Property", name includes title number
- Upload a CD11 certificate PDF → Type prefilled to "Certificate", expiry date populated
- Upload a JPG of a handwritten note → confidence < 0.6, fields stay blank, soft message shown
- Edit a field while AI is still thinking → AI result for that field discarded
- Upload a 50 MB PDF → AI skipped silently with hint message; upload itself still rejected by 25 MB cap

### 13.13 Cost budget

For a typical village hall: 100 docs/year × $0.004 = **$0.40/year**.

For a trust with 10 sites at 100 docs each: **$4.00/year**.

Alarms: configure Anthropic dashboard to alert if monthly spend exceeds $10. At that level something is genuinely wrong (runaway loop, abuse) and needs investigation, not budget approval.

### 13.13.1 Follow-up — cost monitoring TODO

**Pending**: production cost monitoring is not yet wired up. Before this feature sees real usage at scale, do the following:

1. **Set a hard monthly cap** in Anthropic console → Plans & Billing → Limits (suggested: $5/month for a single-trust deployment)
2. **Add lightweight client-side telemetry** — log AI suggestion call count + latency to a per-org counter, surface in `/settings` (future)
3. **Review actual run-rate** after the first month of usage to recalibrate the cost projection in §13.13
4. **Consider knobs to turn if costs are higher than expected**: drop `reasoning` from the tool schema (~50 output tokens saved per call), skip AI for files > 10 pages, or switch model

This TODO is documented here rather than spawning a separate feature doc because it is operational/observational rather than functional. Pick it up before broad rollout to multiple trusts.

---

## 14. Explicit expiry toggle (v1.2 enhancement)

### 14.1 Why

Many documents simply don't expire — Land Registry titles, building deeds, charity constitutions, asset purchase invoices. In v1.0/v1.1 the expiry field was just an optional date input, leaving "no expiry" as an implicit state (empty input). That's ambiguous: did the user mean *no expiry* or *I haven't checked yet*?

This enhancement makes the choice explicit. The default is "No expiry" (the common case for non-time-bound documents); when a user has a real expiry date, they tick the box and the date input appears.

### 14.2 UX

Replace the bare `<input type="date">` with a checkbox + conditional reveal:

```
☐ This document has an expiry date
```

When checked, a date input slides into view using the standard CSS-grid expand/collapse pattern from `design_system.md` §4.2:

```
☑ This document has an expiry date
   Expires on: [_____________]
```

When the checkbox is unticked, the date value is cleared and `expires_at = NULL` is sent on save.

### 14.3 AI integration

When the AI suggestion (§13) returns a non-null `suggested_expiry`, the modal automatically:

1. Ticks the "This document has an expiry date" checkbox
2. Pre-fills the date input
3. Shows the AI pill next to the checkbox label

If the AI returns `suggested_expiry: null` (the document genuinely doesn't expire), the checkbox stays unticked and no AI pill is shown for the expiry field. This is correct behaviour — the AI confirmed there's no expiry.

If the user manually unticks the checkbox after AI ticked it, the AI pill disappears and the date is cleared.

### 14.4 Database

No schema change. `expires_at` is already nullable. The checkbox is a UI affordance only; on save:

- Checkbox unticked → `expires_at = null`
- Checkbox ticked + date set → `expires_at = '<ISO date>'`
- Checkbox ticked + date empty → save button stays disabled (or returns validation error)

### 14.5 Validation

Client-side: when the checkbox is ticked but the date input is empty, disable the Save button and show a hint: *"Please pick a date or untick the box."*

Server-side: no new validation needed. The existing `validateMetadata` happily accepts a null `expiresAt`.

### 14.6 Testing

Manual verification:

- Upload with checkbox unticked → row saved with `expires_at = null`; vault shows "—" in Expires column
- Upload with checkbox ticked + date filled → row saved with date; vault shows the date with appropriate badge
- AI returns expiry → checkbox auto-ticks, date fills, AI pill shown
- AI returns null expiry → checkbox stays unticked, no AI pill
- User unticks checkbox after AI ticked it → date clears, AI pill disappears
- User ticks checkbox without entering a date → Save button disabled

---

## 15. Compliance-item linking from upload (v1.3 enhancement)

### 15.1 Why

The `documents.compliance_item_id` column shipped alongside Compliance Register v1.0 (its own migration) but the upload modal does not surface compliance items as a link target. As a result, attaching a quote PDF to a compliance item requires an awkward two-step (upload as trust-level → run a separate update). This v1.3 enhancement exposes compliance linkage in the upload flow.

### 15.2 UX

The upload modal gains a new optional pre-fill: `preselectedComplianceItemId` + `preselectedComplianceItemName`.

When set (i.e. when the modal is opened from a compliance detail page), the modal shows a small info banner — same shape as the existing asset pre-fill banner:

```
Linking to compliance item: <strong>Annual Oil Boiler Service</strong>
```

The user does not get a free-form "pick a compliance item" select for now. Linking is initiated **from** the compliance item's detail page only. This keeps the modal lean and avoids a typeahead control searching potentially many items.

A document linked to a compliance item is, by convention, a quote or a satisfaction certificate. The compliance detail page renders a list of linked documents and a single "Upload quote / certificate" button — that button opens the modal pre-filled with the item id.

### 15.3 Server action change

`DocumentMetadata` and `CreateDocumentInput` gain `complianceItemId?: string | null`. `createDocument` and `updateDocument` validate that the referenced compliance item belongs to the current org before write.

A document **may** be linked to both an asset and a compliance item simultaneously (the common case for a CD11 certificate — it's about the boiler AND it satisfies the annual gas safe service obligation). The two FKs are independent.

### 15.4 No new database changes

`documents.compliance_item_id` already exists from the Compliance Register migration `20260429_link_documents_to_compliance.sql`. v1.3 is purely application-layer.

### 15.5 Server-side validation addition

```typescript
if (data.complianceItemId) {
  const [item] = await db
    .select({ id: complianceItems.id })
    .from(complianceItems)
    .where(and(eq(complianceItems.id, data.complianceItemId), eq(complianceItems.organisationId, user.organisationId)))
    .limit(1);
  if (!item) return { success: false, error: 'Linked compliance item not found.' };
}
```

### 15.6 Testing

- Upload from compliance detail page → row inserted with `compliance_item_id` populated; appears in the item's linked-documents list
- Upload from asset detail page (existing flow) → `compliance_item_id` is null, behaviour unchanged
- Upload from `/documents` (no pre-fill) → `compliance_item_id` is null, behaviour unchanged
- Cross-org compliance item id → server rejects with clean error

---

## 16. Role-aware uploads from compliance (v1.4 enhancement)

### 16.1 Why

When a document is uploaded against a compliance item, the document's purpose is implied by the compliance item's lifecycle stage:

- Item is in `pending`, `quoting`, `awaiting_approval`, `approved`, or `scheduled` → uploaded doc is a **quote** (or related operational doc)
- Item is in `completed` (or being completed) → uploaded doc is a **satisfaction certificate / report**

In v1.3 the upload modal still exposed the **Type** and **Expiry** fields when launched from a compliance item, asking the user to confirm two things the system already knew. v1.4 hides them when the role is implicit.

### 16.2 UX

The modal accepts a new `role` prop: `'quote' | 'certificate' | undefined`.

When `role === 'quote'`:

- The **Type** field is hidden; the doc is auto-typed as "Quote"
- The **Expiry** section is hidden; quotes don't track expiry in this model

When `role === 'certificate'`:

- The **Type** field is hidden; the doc is auto-typed as "Certificate"
- The **Expiry** section remains visible (certificates often expire)

When `role` is undefined (e.g. opened from `/documents` directly or from an asset detail page), all fields show as before — that's the existing behaviour for v1.0–v1.3.

The compliance detail card (`ComplianceDocumentsCard`) decides the role:

- Item status === `completed` → `role='certificate'`
- All other statuses → `role='quote'`

### 16.3 Database

A new seeded document type — `Quote` — is added so the modal has a stable Type to lock to:

```sql
INSERT INTO document_types (name) VALUES ('Quote') ON CONFLICT DO NOTHING;
```

No schema change.

### 16.4 Server-side fallback

If the seed migration didn't land or the "Quote" / "Certificate" rows have been deleted, the server-side `createDocument` validation already rejects an unknown `docTypeId`. The modal falls back to showing the Type field if it can't resolve the canonical type id at open time.

### 16.5 Testing

- Open upload from a `quoting` compliance item → Type and Expiry hidden; saved doc has `doc_type = 'Quote'`
- Open upload from a `completed` compliance item → Type hidden, Expiry shown; saved doc has `doc_type = 'Certificate'`
- Open upload from `/documents` (no role) → Type and Expiry both visible (regression check)
- Open upload from asset detail page (no role) → Type and Expiry both visible (regression check)
- Force-delete the "Quote" doc type row → modal degrades gracefully and shows the Type field

---

## Changelog

| Version | Date       | Change |
|---------|------------|--------|
| v1.0    | 2026-04-27 | Initial spec — `documents` table, Vercel Blob storage, upload via direct-to-Blob client flow, vault list + detail pages, asset detail integration. Compliance-item linkage deferred to v1.1. **Shipped 2026-04-27.** |
| v1.1    | 2026-04-27 | AI auto-categorisation via Claude Haiku 4.5 (§13). Reads PDFs and images at upload time, pre-fills name / type / expiry with confidence scoring. Adds `ai_suggested`, `ai_confidence`, `ai_reasoning` columns to `documents`. Adds `ANTHROPIC_API_KEY` to required env. Org-level admin toggle planned for the future Organisation Profile feature. **Shipped 2026-04-27.** |
| v1.2    | 2026-04-27 | Replace bare expiry date input with explicit "This document has an expiry date" checkbox + conditional reveal (§14). Defaults to no-expiry (the common case). AI integration: auto-ticks the checkbox when a date is suggested. No schema change. **Shipped 2026-04-27.** |
| v1.3    | 2026-04-28 | Compliance-item linking from upload (§15). The `documents.compliance_item_id` FK landed alongside Compliance Register v1.0 but the upload modal didn't surface it. v1.3 exposes it via a `preselectedComplianceItemId` pre-fill, accessed from the compliance detail page's "Upload quote / certificate" button. Application-layer only — no new schema. **Shipped 2026-04-28.** |
| v1.4    | 2026-04-28 | Role-aware uploads from compliance (§16). Hides redundant Type and Expiry fields when the doc's purpose is implied by the compliance item's lifecycle stage (quote vs certificate). Adds a "Quote" document type seed. Pure UX enhancement, no schema change. |
