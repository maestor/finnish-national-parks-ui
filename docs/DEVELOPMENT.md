# Development Guide

## Project Overview

**Finnish National Parks UI** is a Next.js 16 App Router application that consumes a separate Hono backend API. It serves two audiences:

- **Public visitors** — a visit-focused landing page plus an interactive map of Finnish national parks
- **Admin users** — a control panel for managing park visit history and notes

Authentication is Google OAuth with an allowlist managed by the backend.

---

## Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack)              |
| Language    | TypeScript 5 (strict mode)                      |
| Styling     | Tailwind CSS v4 + CSS variables                 |
| UI Icons    | Lucide React                                    |
| i18n        | next-intl (Finnish `fi` hardcoded)              |
| Theme       | next-themes (dark/light/system)                 |
| PWA         | Serwist                                         |
| Testing     | Vitest + jsdom, Testing Library, Playwright     |
| Lint/Format | Biome                                           |
| HTTP Client | Hand-rolled `fetch` wrapper in `src/lib/api.ts` |

---

## Prerequisites

- Node.js (version matching `package.json` engines if specified)
- Backend API running at `http://localhost:3004`
- `.env.local` file with required variables (see `.env.local.example`)

---

## Setup

```bash
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3004
API_KEY=your-hono-api-key
AUTH_JWT_SECRET=at-least-32-characters-shared-secret

# Optional
NEXT_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
AUTH_COOKIE_NAME=__session
AUTH_JWT_ISSUER=reissuvihko-api
AUTH_JWT_AUDIENCE=reissuvihko-ui
NEXT_PUBLIC_SITE_URL=https://reissuvihko.vercel.app
```

The `AUTH_JWT_SECRET` must match the backend's `AUTH_JWT_SECRET` exactly. `AUTH_JWT_ISSUER` and `AUTH_JWT_AUDIENCE` must match the claims the backend signs into session tokens; both default to the values above and only need to be set when the backend uses a different contract.

---

## Available Scripts

| Command                      | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `npm run dev`                | Start dev server on `http://localhost:4300`             |
| `npm run build`              | Production build                                        |
| `npm run start`              | Start production server                                 |
| `npm run typecheck`          | Clear and regenerate Next-generated route/page types, then run `tsc --noEmit` |
| `npm run lint`               | Biome lint check + Tailwind canonical class check       |
| `npm run lint:fix`           | Auto-fix Biome issues + Tailwind canonical class fixes  |
| `npm run lint:tailwind:canonical` | Report non-canonical Tailwind class names          |
| `npm run lint:tailwind:canonical:fix` | Rewrite Tailwind classes to canonical equivalents |
| `npm run test`               | Run Vitest unit/component tests once                    |
| `npm run test:coverage`      | Run Vitest with V8 coverage summary + HTML report       |
| `npm run test:watch`         | Run Vitest in watch mode                                |
| `npm run test:e2e`           | Run Playwright E2E (Chromium only)                      |
| `npm run test:e2e:all`       | Run Playwright E2E (all browsers)                       |
| `npm run verify`             | Full gate: typecheck → lint:fix → test:coverage → build |
| `npm run generate:api-types` | Regenerate `src/lib/api-types.ts` from backend OpenAPI  |
| `npm run copy:maplibre-worker` | Sync the MapLibre v6 worker files into `public/maplibre/` (runs automatically via `predev`/`prebuild`) |

**Always run `npm run verify` before asking for review.** Pull requests targeting `main` also run the same `npm run verify` gate in GitHub Actions.

`npm run typecheck` intentionally clears `.next/types` and `.next/dev/types`, then rebuilds the current branch's route and App Router typings through `next typegen` before running `tsc`. This keeps local verification aligned with the checked-out implementation instead of stale generated artifacts from another branch.

Tailwind class naming rule:

- Prefer Tailwind's canonical class spelling whenever the framework already has an equivalent utility.
- Use the important suffix form (`max-w-none!`) instead of the prefix form (`!max-w-none`).
- Prefer named or scale-based utilities such as `rounded-3xl`, `pt-6.5`, `h-104`, and `min-h-30` over equivalent arbitrary values like `rounded-[1.5rem]`, `pt-[26px]`, `h-[26rem]`, or `min-h-[120px]`.
- `scripts/check-tailwind-canonical.mjs` is the repo's source of truth for this rule and runs as part of `npm run lint` and `npm run verify`.

Workflow shorthand:

- After the verify-phase results have been reported, a user reply such as `done` means the batch is accepted and the remaining workflow should continue automatically on the current branch: commit, push, and PR handoff without another stop for confirmation.

---

## Architecture

### App Router Structure

```
src/app/
  (user)/           # Public routes (grouped, no layout effect)
    page.tsx        # Public landing page
    paikat/page.tsx # Canonical public map route
    kaynnit/page.tsx # Canonical public timeline route
    paikka/[slug]/  # Canonical public park detail pages
    reissusuunnittelu/page.tsx # Canonical public trip-planner route
  hallinta/         # Canonical admin routes (protected by proxy)
    layout.tsx      # Sidebar layout
    page.tsx        # Admin landing page
    paikat/         # Park visibility management + park detail editing
    kaynnit/        # Visit management
  kirjaudu/         # OAuth login page
  proxy.ts          # Route protection (Next.js 16 proxy convention)
```

Canonical end-user URLs are Finnish-only:

- `/paikat`
- `/kaynnit`
- `/paikka/[slug]`
- `/reissusuunnittelu`
- `/hallinta`
- `/kirjaudu`

Legacy English URLs such as `/parks`, `/visits`, `/park/[slug]`, `/trip-planner`, `/control-panel`, and `/login` still redirect to the Finnish canonical route.

**Shim convention:** page implementations live in English-named directories (`(user)/parks/`, `(user)/park/[slug]/`, `(user)/visits/`, `(user)/trip-planner/`, `control-panel/**`, `login/`). The canonical Finnish route directories hold one-line re-export shims (for example `src/app/hallinta/page.tsx` → `export { default } from "../control-panel/page"`). Keep this pattern when adding routes: implement in the English-named directory, expose the Finnish canonical route as a shim, and add a legacy redirect to `legacyAppRedirects` in `src/lib/routes.ts` when an English URL already exists.

### Error Handling

- Each route segment has an `error.tsx` boundary (`src/app/error.tsx`, `(user)/`, `control-panel/`, `hallinta/`) that re-exports the shared client fallback in `src/components/layout/route-error.tsx`. It catches unexpected render and fetch failures (for example the home page summary read) and offers a retry via `reset()`.
- Pages that can degrade gracefully (map, visits timeline, park detail) additionally catch their own fetch errors and render an inline error state alongside the still-functional page chrome. Prefer the boundary for unrecoverable failures and inline states for partial degradation.

### Server vs Client Components

- **Server Components** (default): Use `getTranslations` from `next-intl/server`
- **Client Components**: Mark with `"use client"`, use `useTranslations` from `next-intl`
- **Pages**: Default exports only
- **Everything else**: Named exports

### App Metadata Assets

- `public/favicon.svg` is the browser favicon.
- `src/app/icons/**` serves the generated small PNG site icons, PWA icons, and Apple touch icon.
- `src/app/opengraph-image.tsx` provides the square Open Graph share image used by chat apps such as Slack and WhatsApp.
- `src/app/twitter-image.tsx` provides the landscape social preview for Twitter/X.
- Set `NEXT_PUBLIC_SITE_URL` to the deployed canonical origin so generated social image URLs resolve correctly for crawlers and link preview bots.
- Small icon consumers such as Slack badges and launcher surfaces should prefer the favicon-style artwork rather than the larger share-card icon treatment.
- Do not reuse favicon or PWA icon assets as social preview images. Share previews need their own composition to avoid crawler-side cropping.

### Data Flow

```
Browser → Next.js App
          ├─ server-side reads → Hono Backend (:3004)
          └─ browser auth/admin writes → Next.js proxy routes → Hono Backend (:3004)
                               ↓
                        Proxy verifies JWT cookie
                               ↓
                        Control-panel routes protected
```

The backend handles:

- Google OAuth flow (`/auth/google`, `/auth/google/callback`)
- Session cookie (`__session` JWT)
- Park catalog API (`/api/parks`, `/api/parks/{slug}`)
- Park detail admin updates (`PATCH /api/parks/{slug}`)
- Park visit history API (`/api/parks/{slug}/visits`)
- Visit management API (`/api/visits`, `/api/visits/{id}`, image routes under `/api/visits/{id}`)
- Cacheable landing and map API (`/api/home-summary`, `/api/map-summary`) plus the lightweight visits timeline API (`/api/visits-timeline`)

Visit image upload runtime caveat:

- On `localhost`, the control-panel visit image editor still uses the proxied multipart route `POST /api/visits/{id}/images`.
- On non-localhost deployments, the control-panel first requests `POST /api/visits/{id}/images/upload-url`, uploads the prepared file directly to the returned presigned `PUT` URL, and then finalizes the image with `POST /api/visits/{id}/images/complete`.

Route naming caveat:

- In this project, **all `GET` endpoints are public-readable**, including `GET /api/visits` and `GET /api/parks/{slug}/visits`.
- **Non-`GET` endpoints require authenticated admin access.**

### Image Hosting

- Park logos and visit images are served from the backend's Cloudflare R2 bucket.
- `next/image` optimization is enabled through the shared `AppImage` wrapper; the only allowed remote origin is the R2 host in `next.config.ts` `images.remotePatterns`.
- If the backend moves image hosting (for example to a custom R2 domain), update `next.config.ts` and this note in the same change. Do not widen the allowlist with wildcards.

### Public Page Data Strategy

- The public home page (`/`) reads `GET /api/home-summary`.
- The public map page (`/paikat`) reads `GET /api/map-summary`.
- The public visits page (`/kaynnit`) reads `GET /api/visits-timeline`; its optional map view (`?view=map`) additionally reads `GET /api/map-summary` for marker coordinates.
- Public park detail pages still read `GET /api/parks/{slug}` and `GET /api/parks/{slug}/visits`, but those reads now use cacheable public fetches by default and fall back to an authenticated request when the backend requires an admin session for a hidden park.
- Admin-only quick links on public pages are resolved client-side with `useAuth`, so the page HTML can stay cache-friendly while signed-in users still see edit and add-visit affordances after hydration.
- Visit and public park mutations call the local Next.js route `POST /api/revalidate-public-cache` so the frontend can invalidate cached public pages immediately after a successful write.

### MapLibre Worker (v6)

MapLibre GL v6 ships ESM-only and cannot auto-detect its worker URL inside the Next.js/Turbopack module graph. The app therefore self-hosts the worker:

- `scripts/copy-maplibre-worker.mjs` copies `maplibre-gl-worker.mjs` and its sibling `maplibre-gl-shared.mjs` from `node_modules` into `public/maplibre/` (gitignored) and runs automatically via the `predev` and `prebuild` npm hooks, so local dev, `npm run verify`, and Vercel builds all stay in sync with the installed `maplibre-gl` version.
- `src/components/map/map-worker.ts` calls `setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")`; it is imported by `src/components/map/map-style.ts`, which every map component already imports.
- The CSP `worker-src 'self' blob:` in `next.config.ts` covers the same-origin worker file.

---

## Authentication Flow

1. User clicks **"Kirjaudu"** → goes to `/kirjaudu`
2. Clicks **"Kirjaudu Googlella"** → goes to frontend `/auth/login`
3. Frontend redirects to proxied `/auth/google`
4. Backend redirects to Google OAuth consent screen
5. Google redirects back to frontend `/auth/google/callback`, which proxies the backend callback
6. Backend validates allowlist, sets `__session` cookie through the frontend response, then redirects to `/hallinta`
7. `src/proxy.ts` verifies the cookie on every `/hallinta/*` request
8. Header shows **"Hallinta"** link when authenticated
9. Control panel has **"Kirjaudu ulos"** logout button

---

## API Client

Use `apiFetch<T>(path, options?)` from `src/lib/api.ts`:

```typescript
import { apiFetch } from "@/lib/api";

// GET
const parks = await apiFetch<{ parks: Park[] }>("/api/parks");

// POST
const visit = await apiFetch<Visit>("/api/parks/pallas/visits", {
  method: "POST",
  body: JSON.stringify({ visitedOn: "2024-06-15" }),
});
```

- For server-side requests, sends `Authorization: Bearer <API_KEY>` directly to the backend
- For browser-side calls, uses same-origin frontend routes such as `/auth/me` and `/api/visits/:id`
- Sends cookies (`credentials: "include"`) in browser for auth and admin write endpoints
- Throws `ApiError` on non-2xx responses
- Handles empty-body 204 responses

The browser does **not** need direct access to `API_KEY`. Next.js route handlers relay browser auth and admin write requests to the backend and attach the server-side key there.

Use `apiPublicFetch<T>(path, options?)` for cacheable public server-side reads:

- Does **not** forward request cookies
- Can be tagged with Next.js cache tags for explicit revalidation after writes

---

## Regenerating API Types

When the backend OpenAPI spec changes:

```bash
npm run generate:api-types
```

This fetches `http://localhost:3004/openapi.json` and overwrites `src/lib/api-types.ts`.

**Do not hand-edit generated files.**

---

## Adding Environment Variables

1. Add to `.env.local.example` with description
2. Add to `src/lib/env.ts` schema with Zod validation
3. Add to `src/test/setup.ts` mock if used in tests
4. Document in this file if significant

---

## Security And Sustainability Guardrails

These are contributor defaults, not optional polish:

- **Protect every mutation boundary** — New non-`GET` routes, cache revalidation endpoints, upload flows, and admin helpers must require explicit auth or a signed/shared-secret check. Public reads are fine; anonymous writes are not.
- **Keep secrets and trust boundaries server-side** — `API_KEY`, JWT secrets, cookies, and presigned upload credentials must stay out of client bundles, logs, URLs, and browser storage. If a route depends on trusted headers or cookies, document that boundary in the same change.
- **Avoid HTML string injection** — Prefer React nodes, `textContent`, and DOM APIs over `innerHTML` or `dangerouslySetInnerHTML`, especially for API, translation, or user-derived content. If raw HTML is unavoidable, sanitize it and document why the source is trusted.
- **Allowlist external origins narrowly** — Remote image hosts, map tiles, upload targets, embeds, and other third-party origins should be added one by one with a concrete reason. Avoid wildcard host patterns unless the team has explicitly accepted the risk.
- **Prefer efficient reads over duplicated work** — Bias toward cacheable server reads, explicit cache tags, and small client islands instead of repeated client fetches or unnecessary hydration. When changing caching, revalidation, or offline behavior, document how freshness and invalidation are supposed to work.
- **Optimize media before network transfer** — Keep image and asset payloads constrained before upload or render. Large media features should justify their size, optimization path, and fallback behavior.
- **Treat dependencies as ongoing maintenance cost** — Before adding a package, check whether existing repo tools already solve the problem. Prefer well-maintained packages with a clear purpose, and run `npm audit` after dependency changes so accepted residual risk is explicit.

### Security Headers and Request Timeouts

- `next.config.ts` sets baseline security headers on all routes: a Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, a `Permissions-Policy` that keeps geolocation self-only, and HSTS in production.
- The CSP allows exactly the external origins the app needs: the R2 image bucket (also the presigned upload target), the OSM tile origin, and the configured map style origin. When adding a new external origin (tiles, embeds, storage), extend the CSP and `images.remotePatterns` in the same change.
- `script-src 'unsafe-inline'` is required today (Next.js inline bootstrap + next-themes); move to a nonce-based policy before tightening it.
- Backend fetches in `src/lib/api.ts` and `src/lib/backend-proxy.ts` use a 10-second `AbortSignal.timeout` so a hung backend cannot pin server components or route handlers; proxy timeouts surface as 504.
- `AUTH_JWT_SECRET` must be at least 32 characters; the env schema rejects shorter secrets at boot.

### Session Token Contract and Proxy AuthZ

- Session verification is centralized in `src/lib/session-auth.ts`. Tokens must be HS256-signed with `AUTH_JWT_SECRET` and carry `iss: "reissuvihko-api"` and `aud: "reissuvihko-ui"` (overridable via `AUTH_JWT_ISSUER` / `AUTH_JWT_AUDIENCE`); both claims are bound at verification.
- `src/proxy.ts` gates `/hallinta/*` page shells on a valid session. Route handlers that proxy admin mutations additionally require the `role: "admin"` claim via `proxyBackendRequest(request, path, { requireAdmin: true })`; missing/invalid sessions get 401 and non-admin sessions 403.
- Admin-gated proxy routes: park mutations (`/api/parks/[slug]`, `/removed`, `/visits`), visit mutations (`/api/visits/[id]` and all image sub-routes), `GET /api/admin/parks/visibility`, and `POST /api/revalidate-public-cache`. Public reads and the public trip-planner POSTs stay unauthenticated.
- Non-`GET` proxy requests must carry an `Origin` header whose host matches the request host; mismatches get 403 (CSRF defense-in-depth on top of the `SameSite=Lax` session cookie).
- Proxy routes forward only an allowlist of client headers (`accept`, `content-type`, `cookie`) to the backend. Client-sent `authorization` headers are never forwarded; the proxy always sets the server-side `API_KEY` itself.

---

## Coding Conventions

See `AGENTS.md` for the full convention list. Key rules:

- **Arrow functions only** — no `function` declarations
- **Strict TypeScript** — no `any` without justification
- **Prefer boolean-safe JSX short-circuit rendering** — when rendering something or nothing, prefer `isVisible && <Panel />` over `isVisible ? <Panel /> : null`; if the condition is not already a real boolean, hoist or compute an explicit boolean first so `lint/nursery/noLeakedRender` stays satisfied
- **Finnish UI copy** — all user-facing text in `messages/fi.json`
- **Accessible by default** — semantic HTML, `aria-label` on icon buttons, visible focus
- **Fix clearly off-pattern code in touched areas** — when a task brings you into code that obviously conflicts with current repo conventions, fold the nearby refactor into the same change instead of preserving the mismatch
- **Centralize repeated UI patterns early** — when a page shell, hero block, panel surface, filter row, card layout, or class recipe is already reused or clearly becoming a shared pattern, extend an existing shared component/style module or create one in a neutral location instead of copying and re-tuning nearly identical markup page by page
- **Tailwind v4** — semantic tokens (`bg-background`, `text-primary`)
- **Dark mode** — use `dark:` variants, test both themes

## PWA Assets

- The web app manifest is defined in `src/app/manifest.ts`
- The Serwist worker source lives in `src/app/sw.ts`
- The service worker route is exposed from `src/app/serwist/[path]/route.ts`
- App install icons are served from `src/app/icons/`
- The shared icon artwork and image responses live in `src/lib/pwa-icon.tsx`
- Changes to offline, caching, or service-worker registration behavior must be verified against the intended production experience and documented in the same PR.

---

## Backend Assumptions

- Port: **3004**
- Auth endpoints: `/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/logout`
- API endpoints: `/api/parks`, `/api/parks/{slug}`, `/api/parks/{slug}/visits`, `/api/parks/{slug}/removed`, `/api/visits`, `/api/visits/{id}`
- Cacheable frontend endpoints: `/api/home-summary`, `/api/map-summary`, `/api/visits-timeline`
- `GET` endpoints are public-readable; non-`GET` endpoints require authenticated admin access
- OpenAPI doc: `http://localhost:3004/openapi.json`

## Production Deployment Notes

- The frontend expects `NEXT_PUBLIC_API_URL`, `API_KEY`, and `AUTH_JWT_SECRET` to be set in Vercel.
- `AUTH_JWT_SECRET` must match the backend exactly so `src/proxy.ts` and `src/lib/session-auth.ts` can verify the session JWT. The token's `iss`/`aud` claims must also match `AUTH_JWT_ISSUER` / `AUTH_JWT_AUDIENCE` (defaults `reissuvihko-api` / `reissuvihko-ui`).
- For production auth, prefer custom domains such as `app.example.com` and `api.example.com` over two separate default `*.vercel.app` domains.
- See [docs/DEPLOYMENT.md](./DEPLOYMENT.md) for the full deployment checklist.
