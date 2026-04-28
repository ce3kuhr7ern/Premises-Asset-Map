# Feature: Asset Type Management

**Version:** v1.1  
**Status:** In Progress — Phase 2 implementation  
**Route:** `/settings/asset-types`  
**Surface:** Web application — admin/settings area

---

## Purpose

Asset types (Fire Extinguisher, Smoke Detector, Fire Door, etc.) are currently hardcoded in `src/lib/icons/asset-icons.ts`. A trust admin cannot add new types, retire old ones, or configure compliance requirements without a code change.

This feature moves asset type configuration into the database so that:
- Trust admins can create and manage their own asset type library
- Each type carries compliance metadata (inspection interval, certificate requirement)
- The Place Asset modal loads live types from the DB rather than the hardcoded registry
- The map remains accurate as the venue's asset inventory evolves

---

## UX / UI

### `/settings/asset-types` — List page

- Page header: "Asset Types" with an "Add Asset Type" primary button (top right)
- Table or card list of all types — columns: Icon preview, Name, Layer, Inspection interval, Certificate required, Status (Active / Archived)
- Row actions: Edit (pencil), Archive (soft-delete)
- Empty state: "No asset types yet. Add your first one to start placing assets on the map."
- Archived types shown in a collapsed section at the bottom, with a Restore action

### Create / Edit — inline slide-down panel or modal

Fields:
- **Name** (text, required, max 200 chars) — e.g. "CO₂ Fire Extinguisher"
- **Asset Type / Icon** (select from icon registry) — shows icon preview
- **Layer** (select: Fire Safety, Electrical, Utilities, Openings)
- **Inspection interval** (number input, days — optional) — e.g. 365 for annual
- **Requires service certificate** (checkbox)
- **Certificate type** (text, optional — revealed only when "Requires service certificate" is checked) — e.g. "CD11", "OFTEC", "Gas Safe". Uses CSS grid height transition for smooth reveal.
- **Notes** (textarea, optional) — internal admin notes

### Responsive behaviour

- Desktop: table layout with inline row actions
- Mobile: card-per-type layout, full-width Edit/Archive buttons

---

## API

### Server actions (preferred — admin CRUD triggered by form submissions)

| Action | File | Description |
|---|---|---|
| `createAssetType` | `src/app/actions/asset-types.ts` | Insert new row, validate all fields |
| `updateAssetType` | `src/app/actions/asset-types.ts` | Update name, icon, layer, compliance fields |
| `archiveAssetType` | `src/app/actions/asset-types.ts` | Set `is_active = false` (soft delete) |
| `restoreAssetType` | `src/app/actions/asset-types.ts` | Set `is_active = true` |

All server actions return `Promise<{ success: boolean; error?: string }>`.

### API route (for client-side loading in Place Asset modal)

`GET /api/asset-types` — returns active types only, authenticated.

Response shape:
```typescript
{ success: true; data: AssetTypeSummary[] }
| { success: false; error: string }
```

`AssetTypeSummary`:
```typescript
{
  id: string;
  name: string;
  iconKey: string;
  layer: string;
}
```

---

## Database

### Schema changes — `asset_types` table

Extend the existing `asset_types` table with 6 new columns (one migration file):

| Column | Type | Default | Notes |
|---|---|---|---|
| `icon_key` | `text NOT NULL` | `'asset-fire-door'` | Must match a key in the icon registry |
| `layer` | `text NOT NULL` | `'fire-safety'` | One of: fire-safety, electrical, utilities, openings |
| `is_active` | `boolean NOT NULL` | `true` | False = archived |
| `inspection_interval_days` | `integer` | `NULL` | Null = no scheduled inspection |
| `requires_certificate` | `boolean NOT NULL` | `false` | Must attach cert on service record |
| `certificate_type` | `text` | `NULL` | e.g. "CD11", "OFTEC", "Gas Safe" — only relevant when requires_certificate is true |
| `notes` | `text` | `NULL` | Internal admin notes |

Migration filename: `20260424_extend_asset_types.sql` (v1.0 columns)  
Migration filename: `20260424_add_certificate_type.sql` (v1.1 — certificate_type column)

### Drizzle schema update

Update `src/db/schema/asset_types.ts` to match the migration.

### Seed

Seed the table with the asset types currently in `src/lib/icons/asset-icons.ts` so existing floor plans continue to work after the migration.

---

## Validation

### Client-side (UX only — server is the trust boundary)

- Name: required, max 200 chars
- Icon key: required, must select from dropdown
- Layer: required, must select from dropdown
- Inspection interval: optional, must be a positive integer if provided
- Certificate type: optional, max 200 chars, only relevant when "Requires service certificate" is checked

### Server-side (enforced in server actions)

```typescript
if (!name?.trim() || name.trim().length > 200) return { success: false, error: 'Name is required and must be under 200 characters.' };
if (!iconKey || !VALID_ICON_KEYS.includes(iconKey)) return { success: false, error: 'Invalid icon.' };
if (!VALID_LAYERS.includes(layer)) return { success: false, error: 'Invalid layer.' };
if (inspectionIntervalDays !== undefined && (!Number.isInteger(inspectionIntervalDays) || inspectionIntervalDays < 1)) {
  return { success: false, error: 'Inspection interval must be a whole number of days.' };
}
```

---

## Error Handling

- `loading.tsx` — skeleton table rows while types load
- `error.tsx` — "Could not load asset types. Please refresh the page." with retry button
- Empty state — "No asset types yet" with prompt to add first type
- Server action errors surfaced inline in the form with `role="alert"`
- Archived types that are still referenced by existing map assets are not deleted — only hidden from the Place Asset dropdown

---

## Accessibility

- Page has a single `<h1>Asset Types</h1>`
- Table uses `<thead>`, `<tbody>`, `<th scope="col">` for screen reader column headers
- Icon-only row action buttons have `aria-label` ("Edit Fire Extinguisher", "Archive Fire Extinguisher")
- Form inputs use `.form-label` + `htmlFor` associations
- Checkbox for "Requires certificate" wrapped in `<label>` with visible text
- Error messages use `role="alert"` for immediate announcement
- Create/edit panel uses `aria-expanded` on the trigger button
- Focus returns to the triggering row action button after closing the edit panel

---

## Security

- `/settings/*` is covered by `isAppHost` → `auth.protect()` in middleware ✓
- All server actions call `auth()` and verify `userId` before any DB operation
- Role check: only `trust_admin` role may create, update, or archive asset types — enforced via `can.ts`
- `layer` and `iconKey` values checked against allowlists — no free-text DB write from these fields
- Input trimmed and length-limited before any DB write
- Server action error messages are generic to the client; full error logged server-side
- `GET /api/asset-types` returns only `id`, `name`, `iconKey`, `layer` — no internal fields exposed

---

## Performance

- `/settings/asset-types` is a server component — data fetched at request time, no client-side loading spinner needed for the initial list
- `GET /api/asset-types` used only by the Place Asset modal (client component) — acceptable one-time fetch on modal open; no polling
- Asset type list is small (< 50 rows expected) — no pagination needed for MVP
- `revalidatePath('/settings/asset-types')` called after every server action to keep the list fresh

---

## Testing

### Required tests

- `createAssetType`: valid input → row inserted; missing name → `{ success: false }`; invalid iconKey → `{ success: false }`; unauthenticated → `{ success: false }`
- `updateAssetType`: valid update → row changed; wrong role → `{ success: false }`
- `archiveAssetType`: sets `is_active = false`; does not delete the row
- `GET /api/asset-types`: returns only active types; unauthenticated → 401

### Manual verification

- Place Asset modal no longer shows hardcoded types — shows DB types only
- Archived type disappears from Place Asset dropdown but existing placed assets are unaffected
- Mobile: card layout renders correctly, touch targets ≥ 44px

---

## Changelog

| Version | Date       | Change |
|---------|------------|--------|
| v1.0    | 2026-04-24 | Initial implementation — asset type CRUD, icon/layer/compliance fields, settings page, Place Asset modal integration |
| v1.1    | 2026-04-24 | Added `certificate_type` text field — conditionally revealed when "Requires service certificate" is checked |

---

## Pre-implementation blockers

1. `globals.css` is empty — `.form-input`, `.form-select`, `.form-label`, `.form-checkbox` classes must be added before any form UI is built
2. Existing `/api/map-assets` routes use non-standard response shapes — retrofit to `{ success, data/error }` envelope before adding new routes
3. `can.ts` role check for `trust_admin` must be verified before server actions are wired up
