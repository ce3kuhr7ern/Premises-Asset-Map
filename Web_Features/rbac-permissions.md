# RBAC & Permissions Model

## Purpose
Establishes a robust, database-driven Role-Based Access Control (RBAC) model for the Premises Asset Map. This ensures secure, scoped access to the platform for all internal staff, trust users, and external contractors without relying entirely on third-party provider (Clerk) claims.

## UX / UI
- Users will only see navigation items, assets, and documents within their permitted scope.
- Forms and actions (e.g., "Upload Document", "Edit Asset") will be hidden or disabled if the user lacks the specific permission.
- **Contractors** have a dedicated upload flow limited to job-related certificates.

## API
- A `/api/auth/provision` endpoint will act as a webhook receiver or first-login intercept to provision internal user records (mapping `clerk_id` to internal `users.id`).
- All API endpoints will wrap sensitive operations with the `can(userId, permission, context)` helper to authorize requests.
- Example middleware will block access to `/admin` routes if the user lacks the `trust_admin` role.

## Database
Uses Neon / PostgreSQL via Drizzle ORM.
- **`users` table**: Maps the Clerk `sub` ID to our internal UUID. Holds `email`, `display_name`, `is_active`.
- **`roles` enum**: `trust_admin`, `trustee`, `club_manager`, `club_user`, `contractor`, `auditor`.
- **`memberships` table**: The core mapping of user to role and scope. It holds foreign keys to `organisations`, `sites`, `areas`, `asset_types`, and `document_types`. A `NULL` value in a scope column means "all" within that domain.
- **Stubs**: Basic `organisations`, `sites`, `areas`, `asset_types`, and `document_types` tables were created to ensure strict foreign key integrity.

## Validation
- The schema ensures `memberships.role` must be a valid `app_role` enum.
- Application logic enforces that scopes must be valid foreign keys.
- The `can` helper prevents unauthorized actions, treating `isActive: false` as blocked regardless of role.

## Error Handling
- Attempting an action without permission returns a `403 Forbidden`.
- The `can` function fails securely (returns `false` if `is_active` is false or the permission array doesn't match).

## Accessibility
- UI elements that are disabled due to lack of permissions will use `aria-disabled="true"` rather than being completely removed if the user needs to know the feature exists but isn't available to them (or hidden completely if irrelevant to their role, like the admin dashboard for a contractor).

## Security
- **Source of Truth**: The database is the authoritative source for roles and scopes. The Clerk JWT is ONLY used for identity (authentication).
- **Scope Checking**: Scopes are checked natively at the API level and embedded in SQL queries (e.g., `d.site_id = m.site_id`).
- **Four-Eyes Principle**: The `compliance:approve` permission is intentionally separated from `compliance:manage` to prevent self-approval.

## Performance
- Membership data should be cached in the session layer (e.g., Redis) with a short TTL to prevent querying the database on every authenticated request.
- SQL-level scoping is used to filter records during the query, avoiding large in-memory dataset filtering.

## Testing
- Unit tests must cover all role scenarios in the `can` helper function.
- Integration tests must verify that endpoints correctly return `403` when accessed by users with out-of-scope memberships.
- Verify the `trust_admin` bypass logic.
