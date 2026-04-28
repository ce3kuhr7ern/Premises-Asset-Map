# Feature: Asset Register

**Version:** v1.1
**Status:** Planned — Phase 1 complete, ready for implementation
**Routes:**
- `/assets` — list / register
- `/assets/[id]` — single asset detail
- `/assets/new` — create flow (or inline modal — see UX)

**Surface:** Web application — primarily a back-office register, optimised for desktop but fully usable on mobile for field add/edit.

---

## 1. Purpose

The platform currently has two layers:

- **Asset types** (the catalogue: Fire Extinguisher, Distribution Board, …) — defines compliance metadata like inspection interval and certificate type
- **Map assets** (placements on a floor plan: x/y coordinates plus a label and icon)

What is missing is the **physical asset record** — the actual fire extinguisher hanging on Wall A, with serial number `FE-2024-0042`, installed on 12 March 2024, last inspected 18 February 2026, next due 18 February 2027.

This feature introduces the `assets` entity. It is the bridge between the map (where things are) and the compliance engine (when each thing must be inspected, who certified it, and what action was raised when it failed).

The asset register is **the canonical list of every physical thing the trust is responsible for**. Every downstream module (inspections, actions, exports, dashboard health KPIs) reads from here.

---

## 2. UX / UI

### 2.1 `/assets` — Register page

Page header: "Assets" with primary action "Add Asset" (top right).

Filter / control row (sticky on scroll):

- **Search** — free-text against name, serial number, manufacturer
- **Type filter** — multi-select chip group of asset types (loaded from `/api/asset-types`)
- **Layer filter** — chips: Fire Safety / Electrical / Utilities / Openings
- **Status filter** — chips: Active / Archived / All
- **Compliance filter** — chips: All / Due soon / Overdue (drives the status badge logic in §7)
- **Site / floor plan filter** — only if more than one site exists (skip for MVP single-site)

Default sort: `next_inspection_due` ascending, with NULL last.

#### Desktop table columns

| # | Column | Notes |
|---|---|---|
| 1 | Icon + Name | Asset name + 24×24 icon badge from asset_type.icon_key |
| 2 | Type | asset_type.name (e.g. "Fire Extinguisher") |
| 3 | Serial | Monospace |
| 4 | Location | floor_plan.name + small "view on map" link if `map_asset_id` is set |
| 5 | Installed | Short date (12 Mar 24) |
| 6 | Next due | Short date + status badge (green/amber/red/grey per §7) |
| 7 | Actions | Edit, Archive |

Row click → asset detail page.

#### Mobile

Card-per-asset with: icon, name, serial, location, status badge, next-due date. Tap → detail page. Filter row collapses behind a single "Filters" button that opens a bottom sheet.

### 2.2 `/assets/[id]` — Detail page

Two-column on desktop, single column on mobile.

**Header bar** (full width): Back link, asset name, status badge, action buttons (Edit, Archive, Delete).

**Left column (or top on mobile):**
- Identity card — name, serial, asset type, manufacturer, model
- Lifecycle card — installed, purchased, archived (if applicable), warranty expiry
- Compliance card — inspection interval, last inspected, next due, certificate type required
- Notes — long-form text

**Right column (or bottom on mobile):**
- Location card — site, floor plan, "view on map" CTA opening `/map/[floorPlanId]?selected=[mapAssetId]`
- Inspection history (placeholder for v1.0 — populated by Inspections feature)
- Linked documents (placeholder for v1.0 — populated by Document Vault feature)

### 2.3 Create / Edit flow

Inline panel on the register page (consistent with Asset Type Management v1.1) — no separate route.

Fields:

- **Asset type** (select, required) — populated from `/api/asset-types` active types
- **Name / label** (text, required, max 200) — pre-filled from asset_type.name on selection, editable
- **Serial number** (text, optional, max 100)
- **Manufacturer** (text, optional, max 200)
- **Model** (text, optional, max 200)
- **Installed date** (date input, optional)
- **Purchase date** (date input, optional)
- **Warranty expiry** (date input, optional)
- **Last inspected** (date input, optional) — auto-populated from inspections in v1.1
- **Notes** (textarea, optional)
- **Location** (read-only confirmation if placing from map; "Place on floor plan" CTA if creating standalone — opens floor plan picker with click-to-place)

Edit panel populates with existing values. Archive is a separate action (sets `status = 'archived'` + `archived_at = now()`); it does not delete.

### 2.4 Place Asset modal — integration

When a user clicks the floor plan to place a marker, the existing `AssetPlacementModal` is extended with two modes:

1. **Quick place** (default — current behaviour) — only label + asset type. Creates an `assets` row with status `active` AND a `map_assets` row linked to it.
2. **Detailed place** — "Add full details" link opens the full asset form on the register page, pre-filled with the placement coordinates.

Cleaner separation: every map_asset corresponds to a real asset record. No more orphan markers.

---

## 3. API

### 3.1 Server actions — `src/app/actions/assets.ts`

The destructive surface has two distinct user-facing actions:

- **Archive** (soft delete) — reversible. Sets `status = 'archived'`, hides from default register filter, removes the marker from the map, but the row and any references remain intact. This is the safe default.
- **Delete** (hard delete) — irreversible. Removes the `assets` row entirely. Cascades to `map_assets` via FK. Blocked when inspections reference the asset (once that module ships); for v1.0, blocked when any `map_assets` row references it (force the user to archive first).

| Action | Description |
|---|---|
| `createAsset` | Insert row, validate, return new asset id |
| `updateAsset` | Update editable fields |
| `archiveAsset` | Soft delete — set `status='archived'`, `archived_at=now()`. Reversible. |
| `restoreAsset` | Reverse archive — set `status='active'`, clear `archived_at` |
| `deleteAsset` | Hard delete — permanently remove the row. Blocked if a map_asset or inspection references it. Requires explicit confirmation in the UI. |

All return `Promise<{ success: true; data?: { id: string } } | { success: false; error: string }>`.

### 3.2 API route — `GET /api/assets`

For the Place Asset modal and any future client-side searches.

Query params: `q`, `typeId`, `status`, `limit`, `cursor`.

Response: `{ success: true, data: AssetSummary[], nextCursor: string | null }`

`AssetSummary`:

```typescript
{
  id: string;
  name: string;
  serial: string | null;
  iconKey: string;
  layer: string;
  status: 'active' | 'archived';
  nextInspectionDue: string | null;  // ISO date
}
```

### 3.3 Existing routes that change

- `POST /api/map-assets` — must now also create or link to an `assets` row. Either accepts an `assetId` (existing asset) OR creates one inline from `{ name, iconKey }` (current behaviour for backwards compatibility).
- The existing `map_assets.iconKey` and `map_assets.label` become **denormalised cache columns** for fast map rendering — the source of truth moves to `assets` via FK. Migration in §4.2 handles backfill.

---

## 4. Database

### 4.1 New table — `assets`

```sql
CREATE TABLE IF NOT EXISTS assets (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id       uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  site_id               uuid        NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_type_id         uuid        NOT NULL REFERENCES asset_types(id) ON DELETE RESTRICT,
  name                  text        NOT NULL,
  serial_number         text,
  manufacturer          text,
  model                 text,
  installed_at          date,
  purchased_at          date,
  warranty_expires_at   date,
  last_inspected_at     date,
  next_inspection_due   date,           -- computed field, set by trigger or by inspection writes
  status                text        NOT NULL DEFAULT 'active',  -- 'active' | 'archived'
  archived_at     timestamptz,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assets_site_idx        ON assets (site_id);
CREATE INDEX assets_type_idx        ON assets (asset_type_id);
CREATE INDEX assets_status_idx      ON assets (status);
CREATE INDEX assets_next_due_idx    ON assets (next_inspection_due);
```

### 4.2 Extend `map_assets`

```sql
ALTER TABLE map_assets
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES assets(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS map_assets_asset_idx ON map_assets (asset_id);
```

Backfill existing rows — for every `map_asset` without an `asset_id`, create a corresponding `assets` row using `label` → `name` and looking up `asset_type_id` by matching `iconKey`. Run inside the same migration file.

`map_assets.label` and `map_assets.icon_key` remain — they become a denormalised cache. Updates to the parent asset propagate via server action (or a Postgres trigger added later).

### 4.3 Migrations

- `20260427_add_assets_table.sql` — create `assets` + indexes
- `20260427_link_map_assets_to_assets.sql` — add `asset_id` to `map_assets`, backfill, add index

Two files because they are two distinct concerns per database-standards.md.

### 4.4 Drizzle schema files

- New: `src/db/schema/assets.ts`
- Update: `src/db/schema/map_assets.ts` to add `assetId` column
- Export from `src/db/schema/index.ts`

Use `InferSelectModel<typeof assets>` everywhere — never hand-write the type.

---

## 5. Validation

### 5.1 Client-side (UX only)

- Name: required, max 200
- Serial / manufacturer / model: max 200 each, optional
- All dates: optional, must be valid ISO dates if provided
- `purchased_at` ≤ `installed_at` if both provided (warning, not block)
- `warranty_expires_at` ≥ `installed_at` if both provided (warning, not block)

### 5.2 Server-side (enforced)

```typescript
if (!name?.trim() || name.trim().length > 200) return { success: false, error: 'Name is required and must be under 200 characters.' };
if (!assetTypeId || !await assetTypeExists(assetTypeId)) return { success: false, error: 'Invalid asset type.' };
if (!siteId || !await userBelongsToSite(userId, siteId)) return { success: false, error: 'Invalid site.' };
if (serialNumber && serialNumber.length > 100) return { success: false, error: 'Serial number too long.' };
// dates: pass through to Postgres date type — let it reject invalid input
```

### 5.3 Computed fields

- `next_inspection_due` is derived: if `last_inspected_at` is set AND `asset_type.inspection_interval_days` is set, then `next_inspection_due = last_inspected_at + interval days`. Otherwise `NULL`. Recomputed in every server action that touches the relevant inputs.

---

## 6. Error Handling

- `loading.tsx` — skeleton table rows on `/assets`, skeleton card on `/assets/[id]`
- `error.tsx` — "Could not load assets. Please refresh." with retry button (per error-handling-standards)
- Empty state on register: "No assets yet. Add your first asset to start tracking compliance."
- `not-found.tsx` on `/assets/[id]` — "Asset not found or has been deleted."
- Server action errors surfaced inline in the form with `role="alert"`
- Archived assets: detail page shows greyed-out card with "Archived on …" banner; edit form still accessible via an explicit "Restore to edit" action

---

## 7. Status Logic (per scope doc §7)

Computed in the UI at render time from `next_inspection_due` and `status`:

| Badge | Condition |
|---|---|
| 🟢 Green ("Active") | `status='active'` AND `next_inspection_due` is in the future by > 30 days OR is NULL |
| 🟡 Amber ("Due soon") | `status='active'` AND `next_inspection_due` within 30 days (future) |
| 🔴 Red ("Overdue") | `status='active'` AND `next_inspection_due` in the past |
| ⚪ Grey ("Archived") | `status='archived'` |

Use Tailwind tokens from frontend-design-standards §11 admin patterns: `bg-emerald-50 text-emerald-700`, `bg-amber-50 text-amber-700`, `bg-red-50 text-red-700`, `bg-slate-100 text-slate-500`.

---

## 8. Accessibility

- Page has a single `<h1>Assets</h1>`
- Table uses `<thead>`, `<tbody>`, `<th scope="col">`
- Status badges include screen-reader-only text: `<span className="sr-only">Status: </span>Overdue`
- Filter chips are toggle buttons with `aria-pressed`
- Search input has visible label or `aria-label="Search assets"`
- Date inputs use native `<input type="date">` for full keyboard and assistive-tech support
- Edit panel uses `aria-expanded` on the trigger
- Focus returns to the row's edit button after the panel closes
- Touch targets ≥ 44×44px on mobile (per design system)

---

## 9. Security

- All routes under `/assets` covered by `isAppHost` → `auth.protect()` middleware ✓
- Server actions: `auth()` → resolve internal user via `users.clerk_id` → `can(userId, Permission.EditAsset)` (or `ViewAsset` for reads, `DeleteAsset` for delete)
- Multi-tenancy: every query scoped by `organisation_id` derived from the user's active membership — never accept `organisationId` from the client
- Asset cannot be created in a site the user has no membership for — checked via `can()` site context
- `GET /api/assets` returns only fields needed for summary — never `notes` or `manufacturer` unless on the detail endpoint
- Server action error messages stay generic; full error logged with `console.error('[assetAction]', err)`
- Soft-delete (archive) preferred over hard-delete; hard-delete only allowed when no inspections / map_assets reference the asset

---

## 10. Performance

- `/assets` is a server component — initial load fetches first 50 rows, sorted by `next_inspection_due ASC NULLS LAST`
- Server-side pagination via cursor (asset id + next_inspection_due) for >50 rows. No `OFFSET` for large tables.
- Filter changes use URL search params + `revalidatePath` rather than client-side fetching, keeping the page server-rendered
- `/assets/[id]` is a server component; only edit form is a client island
- Indexes on `(site_id, status)`, `(asset_type_id)`, `(next_inspection_due)` cover all sort/filter combinations
- Map page is unchanged — still reads `map_assets` directly with its denormalised label/icon_key for fast render. Only the canonical asset details fetch on demand when a user opens the detail bar.

---

## 11. Testing

### 11.1 Required tests

- `createAsset`: valid → row inserted with computed `next_inspection_due`; missing name → fail; invalid asset_type_id → fail; user without EditAsset permission → fail
- `updateAsset`: changing `last_inspected_at` recomputes `next_inspection_due`; changing `asset_type_id` to one with different `inspection_interval_days` recomputes
- `archiveAsset`: sets status + archived_at; does not delete
- `deleteAsset`: succeeds when no map_assets / inspections reference; fails otherwise
- `GET /api/assets`: returns only authenticated user's organisation; status filter works; cursor pagination works
- Backfill migration: every existing `map_assets` row ends up with a non-null `asset_id` after migration runs (integration test against a fixture DB)

### 11.2 Manual verification

- Create asset → appears in register; click "view on map" → opens floor plan with marker selected
- Place asset from map → register list increases by 1; new asset shows in register with status Active
- Archive asset → register row goes grey, detail page shows archived banner, marker disappears from map (because `map_assets.asset_id` cascade or filter)
- Mobile: filter bottom sheet works, table card layout renders, all touch targets ≥ 44px

---

## 12. Resolved design decisions & remaining blockers

### Resolved (v1.1)

1. **Site selection — single-site model.** One organisation owns exactly one site; no overlap. Server actions derive `site_id` from the user's organisation membership. No site picker needed in the UI. If the trust later expands to multiple sites, this becomes a future v2.0 enhancement.
2. **Inspection write-path** — manual in v1.0; the Inspections module (build order step 9) takes ownership of `next_inspection_due` and `last_inspected_at` when it ships.
3. **Archive vs Delete semantics** — Archive = soft delete (reversible, hides from default views, blocks placement on map). Delete = hard delete (permanent, blocked while a map_asset references the row). The UI presents both as separate actions; Delete always requires a typed confirmation.

### Remaining

1. **`map_assets` backfill matching** — existing rows store `iconKey` (e.g. `iso7010-f001`); the migration looks up `asset_types.id` by matching `icon_key`. This works only because every iconKey currently in use was seeded into `asset_types` in v1.0 of Asset Type Management. Any historical orphan iconKey would break the backfill — verify with `SELECT DISTINCT icon_key FROM map_assets WHERE icon_key NOT IN (SELECT icon_key FROM asset_types);` before running the migration.

---

## Changelog

| Version | Date       | Change |
|---------|------------|--------|
| v1.0    | 2026-04-27 | Initial spec — `assets` table, register page, detail page, link to existing `map_assets`, decommission flow, status logic per scope §7 |
| v1.1    | 2026-04-27 | Renamed "decommission" → "archive" (consistent with Asset Type Management). Split destructive surface into two actions: **Archive** (soft, reversible) and **Delete** (hard, permanent, blocked while map_asset references). Resolved single-site model — one organisation per site, no site picker needed. Inspection write-path confirmed manual until Inspections module ships. |
