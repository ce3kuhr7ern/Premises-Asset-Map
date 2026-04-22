---
description: Formal 10-step strategy for all new features and major adjustments
---
# Development Strategy

This workflow must be followed for every new feature request or significant modification to ensure architectural integrity, design system adherence, and production stability.

## Phase 1: Initiation
1. **Define the Problem**: Summarise what the user is trying to achieve and why the current implementation is insufficient.
2. **Plan the Solution**: Outline the high-level approach, including UI/UX changes and technical logic.
3. **Design the Architecture**: Identify the files, components, and database schemas that will be affected. Define data flow and any new API endpoints.
   - **Security Review (mandatory):** Read `.agent/workflows/Development_Workflow/security-standards.md` and identify which checks apply. Document auth, input validation, API, and data exposure concerns before writing a single line of code.
   - **TypeScript Review (mandatory):** Read `.agent/workflows/Development_Workflow/typescript-standards.md`. Identify all new types, interfaces, and data shapes needed. Plan them before implementation begins.
   - **API Design Review (if applicable):** If the feature introduces new API routes or server actions, read `.agent/workflows/Development_Workflow/api-design-standards.md` and confirm the response shape, validation, and rate limiting strategy.
   - **Database Review (if applicable):** If the feature introduces new tables or schema changes, read `.agent/workflows/Development_Workflow/database-standards.md` for Neon/PostgreSQL migration rules and schema conventions.

## Phase 2: Implementation

4. **Set up Environment**: Ensure any required environment variables, database extensions (e.g., `pg_trgm`, `uuid-ossp`), or new dependencies are identified.
5. **Write the Code**: Implement the feature using the project Design System (`DESIGN_SYSTEM.md`) and global CSS utilities defined in `src/app/globals.css`.
   - **Accessibility (mandatory):** Apply the checklist in `.agent/workflows/Development_Workflow/accessibility-standards.md` as you build. Do not leave this as a post-build step.
   - **Error Handling (mandatory):** Every new page must have a loading state and error state. Follow `.agent/workflows/Development_Workflow/error-handling-standards.md`.
   - **Performance (mandatory for pages and components with images or data fetching):** Read `.agent/workflows/Development_Workflow/performance-standards.md` before deciding on server vs client components, image handling, and cache strategy.
   - **Frontend Design (mandatory for all UI work):** Read `.agent/workflows/Development_Workflow/frontend-design-standards.md` and use established design system classes before reaching for raw Tailwind utilities.
6. **Test**: Write tests for all new API routes, server actions, and critical utility functions. Refer to `.agent/workflows/Development_Workflow/testing-standards.md` for what is required. Verify locally: edge cases, mobile responsiveness, empty states.

## Phase 3: Polish & Launch
7. **Debug & Refine**: Performance optimisation and fixing any UI glitches discovered during testing.
8. **Review**: Compare the final output against the project's Design System and UX standards documented in `DESIGN_SYSTEM.md`.
9. **Deploy**: Push changes to GitHub and verify the Vercel production build.
   - **Pre-commit checklist (mandatory):** Before pushing, run through the pre-commit checklist in `.agent/workflows/Development_Workflow/security-standards.md` Section 9. All applicable items must be checked off.
10. **Monitor & Maintain**: Ensure analytics are firing correctly and the feature remains stable under load.

---

## Standards Reference

| Standard | File | When to Read |
|----------|------|-------------|
| Security | `.agent/workflows/Development_Workflow/security-standards.md` | Phase 1 (architecture) + Phase 3 (pre-commit) |
| TypeScript | `.agent/workflows/Development_Workflow/typescript-standards.md` | Phase 1 (architecture) |
| API Design | `.agent/workflows/Development_Workflow/api-design-standards.md` | Phase 1 if new routes/actions |
| Database | `.agent/workflows/Development_Workflow/database-standards.md` | Phase 1 if new tables/schema changes |
| Accessibility | `.agent/workflows/Development_Workflow/accessibility-standards.md` | Phase 2 (during implementation) |
| Error Handling | `.agent/workflows/Development_Workflow/error-handling-standards.md` | Phase 2 (during implementation) |
| Performance | `.agent/workflows/Development_Workflow/performance-standards.md` | Phase 2 (during implementation) |
| Frontend / Design | `.agent/workflows/Development_Workflow/frontend-design-standards.md` | Phase 2 for all UI work |
| Testing | `.agent/workflows/Development_Workflow/testing-standards.md` | Phase 2 (after implementation) |
| SEO | `.agent/workflows/seo/seo-standards.md` | Phase 2 for public-facing pages |
| Vercel Setup | `.agent/workflows/Development_Workflow/setup-vercel-environments.md` | Initial project setup or new environments |

---

## Feature Documentation

Every feature must be documented as a markdown file in the appropriate directory **before implementation begins**. The feature file is the single source of truth for a feature's intent, design decisions, and technical contract.

| App Surface         | Directory        | Examples                                                                                    |
|---------------------|------------------|---------------------------------------------------------------------------------------------|
| Progressive Web App | `/PWA_Features/` | Asset inspection forms, offline sync, push notifications, QR code scanning, camera capture |
| Web application     | `/Web_Features/` | Admin dashboard, reporting views, map interfaces, user management, third-party integrations |

Each feature file must cover the following sections:

- **Purpose** — what problem it solves and for whom
- **UX / UI** — user flows, wireframe notes, component decisions, responsive behaviour
- **API** — endpoints or server actions, request/response shapes, auth requirements
- **Database** — schema changes, Neon migrations, query patterns
- **Validation** — client-side rules + server-side enforcement
- **Error Handling** — loading, error, and empty states
- **Accessibility** — specific ARIA, keyboard navigation, and contrast considerations
- **Security** — auth checks, input sanitisation, data exposure risks
- **Performance** — caching strategy, image handling, server vs client component decisions
- **Testing** — what must be tested and the test patterns to use

Associate each feature file with the project task tracker for team visibility.
