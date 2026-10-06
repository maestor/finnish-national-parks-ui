# Development Guide

Trip editing includes a separate featured-image slot backed by admin proxy routes. It pages through attached visit and stop thumbnails, stores only a composite source reference, and preserves unsaved trip form text. Public trip detail receives nullable `featuredImage` and renders a contrast-safe hero with the existing fallback when absent or unavailable. The public trip archive at `/retket` reads a private, no-store cursor-paginated card endpoint server-side for its first batch and appends later batches through the same-origin proxy.

## Project Overview

**Finnish National Parks UI** is a Next.js 16 App Router application that consumes a separate Hono backend API. It serves two audiences:

- **Public visitors** — a visit-focused landing page plus an interactive map of Finnish national parks
- **Admin users** — a control panel for managing park visit history and notes

Authentication is Google OAuth with an allowlist managed by the backend. The backend returns `isSuperAdmin` from `/auth/me`; only super admins see `/hallinta/kayttajat`, where they can create one-time Google enrollment links and manage other admin roles or accounts.

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
TRIP_PLANNER_CLIENT_SECRET=at-least-32-characters-planner-boundary-secret
NEXT_PUBLIC_SITE_URL=https://reissuvihko.net
```

The `AUTH_JWT_SECRET` must match the backend's `AUTH_JWT_SECRET` exactly. `AUTH_JWT_ISSUER` and `AUTH_JWT_AUDIENCE` must match the claims the backend signs into session tokens; both default to the values above and only need to be set when the backend uses a different contract.

---

## Available Scripts

| Command                               | Purpose                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run dev`                         | Start dev server on `http://localhost:4300`                                                            |
| `npm run build`                       | Production build                                                                                       |
| `npm run start`                       | Start production server                                                                                |
| `npm run typecheck`                   | Clear and regenerate Next-generated route/page types, then run `tsc --noEmit`                          |
| `npm run lint`                        | Biome lint check + Tailwind canonical class check                                                      |
| `npm run lint:fix`                    | Auto-fix Biome issues + Tailwind canonical class fixes                                                 |
| `npm run lint:tailwind:canonical`     | Report non-canonical Tailwind class names                                                              |
| `npm run lint:tailwind:canonical:fix` | Rewrite Tailwind classes to canonical equivalents                                                      |
| `npm run test`                        | Run Vitest unit/component tests once                                                                   |
| `npm run test:coverage`               | Run Vitest with V8 coverage summary + HTML report                                                      |
| `npm run test:watch`                  | Run Vitest in watch mode                                                                               |
| `npm run test:e2e`                    | Run Playwright E2E (Chromium only)                                                                     |
| `npm run test:e2e:all`                | Run Playwright E2E (all browsers)                                                                      |
| `npm run verify`                      | Full gate: typecheck → lint:fix → test:coverage → build                                                |
| `npm run generate:api-types`          | Regenerate `src/lib/api-types.ts` from backend OpenAPI                                                 |
| `npm run copy:maplibre-worker`        | Sync the MapLibre v6 worker files into `public/maplibre/` (runs automatically via `predev`/`prebuild`) |

Use focused checks while implementing, then pause for user review. After acceptance, run `npm run verify` before committing and pushing. Pull requests targeting `main` also run the same `npm run verify` gate in GitHub Actions.

Plans and prototypes confined to the shared, untracked Reissuvihko Plans vault do not enter the Git workflow: leave the current branch unchanged, even on `main`, and review the artifacts directly. Create or switch to a working branch only when the task starts changing repository files, including tracked documentation or agent instructions.

The pull-request workflow grants `contents: read`, stops after 30 minutes, and cancels an older verification run for the same pull request when a newer commit arrives. Its checkout and Node setup actions are pinned to immutable official release SHAs; Dependabot updates those pins weekly. The separate weekly `Dependency Audit` workflow can be started manually, installs the locked dependency tree, and runs `npm audit --audit-level=high` with development dependencies included. It does not build the application or receive production secrets.

`npm run typecheck` intentionally clears `.next/types` and `.next/dev/types`, then rebuilds the current branch's route and App Router typings through `next typegen` before running `tsc`. This keeps local verification aligned with the checked-out implementation instead of stale generated artifacts from another branch.

Tailwind class naming rule:

- Prefer Tailwind's canonical class spelling whenever the framework already has an equivalent utility.
- Use the important suffix form (`max-w-none!`) instead of the prefix form (`!max-w-none`).
- Prefer named or scale-based utilities such as `rounded-3xl`, `pt-6.5`, `h-104`, and `min-h-30` over equivalent arbitrary values like `rounded-[1.5rem]`, `pt-[26px]`, `h-[26rem]`, or `min-h-[120px]`.
- `scripts/check-tailwind-canonical.mjs` is the repo's source of truth for this rule and runs as part of `npm run lint` and `npm run verify`.

Workflow shorthand:

- After the verify-phase results have been reported, a user reply such as `done` means the batch is accepted and the remaining workflow should continue automatically on the current branch: commit, push, and PR handoff without another stop for confirmation.

Resource baseline:

- The API owns the deterministic O4 payload/query baseline. Run its
  `tests/integration/resource-baseline.integration.test.ts` against the sibling API repository for
  reproducible public-response budgets.
- The UI's `src/components/trips/public-trip-page.test.tsx` keeps the browser-side gallery behavior
  bounded: opening a visit loads one page, and requesting more images loads exactly one next page.
  Production-mode browser transfer measurements remain a separately authorized runtime check.

---

## Architecture

### App Router Structure

```
src/app/
  (user)/           # Public routes (grouped, no layout effect)
    page.tsx        # Public landing page
    paikat/page.tsx # Canonical public map route
    kaynnit/page.tsx # Canonical public timeline route
    retket/page.tsx  # Canonical public trip archive route
    paikka/[slug]/  # Canonical public park detail pages
    reissusuunnittelu/page.tsx # Canonical public trip-planner route
    ajanjaksokatsaus/jako/[shareId]/ # Canonical public date-range review share route
    vuosikatsaus/jako/[shareId]/ # Canonical public year-review share route
  hallinta/         # Canonical admin routes (protected by proxy)
    layout.tsx      # Sidebar layout
    page.tsx        # Admin landing page
    paikat/         # Park visibility management + park detail editing
    kaynnit/        # Visit management
    ajanjaksokatsaus/ # Named date-range review preview/publish page
    vuosikatsaus/   # Year review preview/publish page
  kirjaudu/         # OAuth login page
  proxy.ts          # Route protection (Next.js 16 proxy convention)
```

Canonical end-user URLs are Finnish-only:

- `/paikat`
- `/kaynnit`
- `/retket`
- `/retki/[slug]`
- `/paikka/[slug]`
- `/reissusuunnittelu`
- `/ajanjaksokatsaus/jako/[shareId]` (tokenized named date-range review share pages; intentionally not linked from public navigation)
- `/vuosikatsaus/jako/[shareId]` (tokenized year-in-review share pages; intentionally not linked from public navigation)
- `/hallinta`
- `/hallinta/kayttajat` (super-admin-only admin management)
- `/hallinta/ajanjaksokatsaus`
- `/hallinta/vuosikatsaus`
- `/kirjaudu`

The new-visit form defaults its date picker to the current calendar date in `Europe/Helsinki`.
Existing visit edit values always take precedence.

Legacy English URLs such as `/parks`, `/visits`, `/park/[slug]`, `/trip-planner`, `/control-panel`, `/control-panel/date-range-review`, `/control-panel/year-review`, `/date-range-review/share/[shareId]`, `/year-review/share/[shareId]`, and `/login` still redirect to the Finnish canonical route.

**Shim convention:** page implementations live in English-named directories (`(user)/parks/`, `(user)/park/[slug]/`, `(user)/visits/`, `(user)/trip-planner/`, `control-panel/**`, `login/`). The canonical Finnish route directories hold one-line re-export shims (for example `src/app/hallinta/page.tsx` → `export { default } from "../control-panel/page"`). Keep this pattern when adding routes: implement in the English-named directory, expose the Finnish canonical route as a shim, and add a legacy redirect to `legacyAppRedirects` in `src/lib/routes.ts` when an English URL already exists.

### Keyboard access to content

The root layout renders **Siirry sisältöön** (`layout.skipToContent`) before the header as the first keyboard focus stop. The native `#main-content` link is visually hidden until focused, then appears above the header with theme-aware colors and a visible focus outline. The shared `<main id="main-content" tabIndex={-1}>` receives focus on activation without adding an ordinary Tab stop; subsequent Tab presses continue inside the page content. Its scroll margin keeps the target below the sticky header. Keep this link outside the shell's Suspense boundary so it is available while the shell loads.

### In-page section links

`StickySectionNavigation` serves trip details, park details, and the visited-parks view. On each route entry, it restores a matching URL fragment once after document load and hydration, waiting for streamed targets to become visible. Direct entry and section-link clicks align the section immediately below the sticky navigation using its height and the main-header offset rather than static section scroll margins. The active link follows the section beginning at or above the navigation's lower edge, so a short section stays active even when the next section occupies more of the viewport; at the end of the page, the final visible section becomes active even if it cannot reach that edge. Initial restoration is immediate and preserves the URL/history; later rerenders do not pull the visitor back to the section. On fragment entry, the main header stays visible during automatic positioning; its usual hide/reveal behavior resumes after pointer, wheel, touch, or scroll-key input. Typing and ordinary focus navigation do not release that protection. Ordinary section-link clicks retain smooth scrolling, with reduced-motion support.

For park links such as `?visit=21#visit-history`, the history navigation item supplies `initialTargetId` for a known visit card (`park-visit-21`). Initial entry scrolls to that card while keeping the history link active and preserving the shared URL. Ordinary history links and navigation clicks target the history heading; unknown visit IDs fall back to that heading.

### Page breadcrumbs

`AppBreadcrumbs` resolves explicit page paths through `appRoutes` and `normalizeAppPath`; it does not infer ancestors by splitting URL segments. Place it as the first content item inside the owning public rounded hero, or inside the control-panel content column above the title. The front page and full-width park map omit breadcrumbs and reserve no space for them. Pass park/trip names from data the page already loaded; keep editor labels based on saved data rather than unsaved form state. No breadcrumb data requests or registration effects are needed.

Breadcrumb pages retain the ordinary `py-6` outer padding and use `PUBLIC_BREADCRUMB_PAGE_SHELL_CLASS_NAME` for a compact `gap-4` between sections. Their rounded heroes use `PUBLIC_HERO_PANEL_CLASS_NAME` with `py-4` at both breakpoints; the front page and authenticated trip previews retain ordinary panel spacing. Breadcrumb text is `text-xs leading-4`, while ancestor links retain a 44px touch target. Public hero breadcrumbs use `PUBLIC_HERO_BREADCRUMB_CLASS_NAME` with `mb-2` (8px) before the page label; the planner overrides its parent `space-y-4` for that gap. Photo heroes opt into `group/public-hero` with `data-featured-image="true"`, so the trail uses the photo layer's foreground and focus colors; the ordinary theme returns when the image fails.

The park hero top-aligns its title/facts block. On desktop, its fixed-size logo is positioned at the vertical center of the full details container: the transparent content layer with a featured photo, or the whole panel without one. Reserve horizontal space beside the title/facts so the logo does not overlap them or increase their row height. On mobile, the logo sits above the horizontally centered title and metadata.

`Breadcrumbs` renders a labeled navigation landmark, ordered path, decorative baseline-aligned separators, real ancestor links, and one non-link current item. Mobile shows the immediate linked parent, subsequent context, and current page; earlier ancestors use `sr-only`, remain in the accessibility tree, and become visible on keyboard focus. Breadcrumb links disable prefetch to avoid background authenticated editor requests from previews.

Public trails begin with **Reissuvihko** (`layout.siteTitle`, `/`); nested control-panel trails begin with **Hallinta**. Park editors keep the park name as non-link context. Trip/visit previews link back to their editor. Preserve contextual public-page, preview, and editing actions; remove only exact duplicate list navigation. The front page reserves no breadcrumb space. Login, auth callbacks/dev-login, error/offline screens, and tokenized shared reviews omit breadcrumbs. The renderer lists no sections beyond the supplied page, so it does not expose super-admin navigation on other routes.

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

Backend request timeout policy:

- `src/lib/api.ts` and `src/lib/backend-proxy.ts` default backend-facing requests to a `10s` timeout so hung reads do not pin pages or route handlers.
- Public trip detail reads via `src/lib/public-trip.ts` opt into a `30s` timeout because large trip payloads with trip and visit media can legitimately exceed the generic default.
- Deferred public trip route and image requests use a `30s` timeout. They never reload the trip detail page; opening a gallery loads only the requested visit or stop image page, while route planning runs separately in the background.
- Trip planner nearby searches opt into a `30s` timeout because Geoapify-backed point lookups can legitimately take longer than the generic default.
- Trip planner route searches opt into a `60s` timeout because cold Geoapify-backed long-route planning can exceed the nearby budget while still returning valid results.

The backend handles:

- Google OAuth flow (`/auth/google`, `/auth/google/callback`)
- Local AI-agent login (`/auth/dev-login`) when explicitly enabled by the local API
- Session cookie (`__session` JWT)
- Park catalog API (`/api/parks`, `/api/parks/{slug}`)
- Park detail admin updates (`PATCH /api/parks/{slug}`)
- Park visit history API (`/api/parks/{slug}/visits`)
- Visit management API (`/api/visits`, `/api/visits/{id}`, image routes under `/api/visits/{id}`)
- Tag-cached frontend reads of landing and map API (`/api/home-summary`, `/api/map-summary`) plus the lightweight visits timeline API (`/api/visits-timeline`)

Visit and trip-stop image uploads:

- Both editors use `ManagedImageSection`. On `localhost`, files use the proxied multipart route `POST /api/visits/{id}/images` (or `/api/trip-stops/{id}/images`), one file per request.
- On non-localhost deployments, the control-panel first requests `POST /api/visits/{id}/images/upload-url`, uploads the prepared file directly to the returned presigned `PUT` URL, and then finalizes the image with `POST /api/visits/{id}/images/complete`. Trip stops use the equivalent paths under `/api/trip-stops/{id}/images`.
- Uploads run sequentially in the selected order. The first failure pauses the queue; retry resumes with that file, so later files cannot overtake it. Successfully saved files are removed from the queue and are not uploaded again. Removing a failed file deliberately skips its slot.
- Preparation shows a file counter; uploads show per-file stages and a completed-file progress bar (not byte progress). Upload, selection, removal, and reorder controls are locked while the queue runs. Pending files and their order live only in the mounted editor; reloading or leaving it loses the pending selection.
- The same cache revalidation and refresh run after each batch with successful uploads. No API contract or persistent queue is introduced.

Public API terminology and access caveat:

- Catalog and visit `GET` data used by the public UI are public from an end-user perspective: visitors can access them through the Reissuvihko frontend without logging in.
- The backend is a separate API boundary. Outside localhost, its `/api/*` routes generally require the server-side `API_KEY`; `GET /health`, `GET /openapi.json`, and `GET /assets/logos/*` are anonymous backend reads, while `/auth/*` is anonymous login control flow. Do not describe the backend API itself as anonymously public unless its middleware and tests prove that.
- Admin mutations require authenticated admin access. The frontend proxy keeps the API key server-side and enforces the corresponding session and CSRF checks; the documented public trip-planner POSTs are the deliberate unauthenticated exception.
- Public trip-planner POSTs go through a dedicated proxy guard: request bodies are streamed and capped at 16 KiB before forwarding, and the proxy supplies an opaque planner client ID for the API's shared abuse budget. The client maps `413` and `429` responses to the Finnish retry/validation messages in `messages/fi.json`; do not weaken the guard by forwarding client-supplied budget headers.

### Paired UI/API workflow

- Local development uses the frontend at `http://localhost:4300` and the backend at `http://localhost:3004`.
- The backend repository is [finnish-national-parks-api](https://github.com/maestor/finnish-national-parks-api). Its Zod/OpenAPI definitions are the source of truth for API request and response shapes; this repository consumes generated types.
- For cross-repository work, read both repositories' `AGENTS.md` and relevant development/testing docs, make the backend contract change first, regenerate `src/lib/api-types.ts`, update frontend consumers and fixtures, and verify both runtime and type-level agreement.
- Trip editing keeps admin-only `Reittivalinta` items in the merged itinerary and sends their labeled coordinates through the authenticated `/api/trips/{id}/route-waypoints` and `/api/trip-route-waypoints/{id}` proxy routes. Public trip detail omits those items; the backend uses their coordinates only while building the public route.
- Keep matching branch suffixes but separate Git histories, commits, and pull requests. Use focused checks while implementing, pause for review, then run `npm run verify` after acceptance in each affected repository. Cross-link dependent pull requests and document merge order.

### Image Hosting

- Park logos and visit images ultimately live in the backend's Cloudflare R2 bucket.
- Public park logos may now load through the backend origin first (`NEXT_PUBLIC_API_URL`) before the API redirects to R2, so `next.config.ts` allowlists both the configured backend origin and the R2 host for image loading.
- During local `next dev`, stable backend media URLs resolve through `localhost`; `next.config.ts` enables `images.dangerouslyAllowLocalIP` only in development so the optimizer can reach the local API. Production keeps the private-IP SSRF guard enabled.
- `next.config.ts` keeps optimized-image cache entries alive for at least 31 days (`images.minimumCacheTTL = 2678400`) and constrains generated widths/qualities to the app's actual usage (`deviceSizes`, `imageSizes`, `qualities`, `formats`) so Vercel does not generate unnecessary variants.
- Small local social icons, park logos, backend-provided visit thumbnail URLs, and compact review-story grid media opt out of Vercel optimization with `unoptimized` because they are already tiny or pre-sized. Full review-story media uses responsive Next image variants with explicit `sizes` values.
- Keep large lightbox images optimized; stable application media URLs make the public read-model payloads safe to cache without making the bucket public.
- If the backend moves image hosting or its public origin, update `next.config.ts` and this note in the same change. Do not widen the allowlist with wildcards.

### Public Page Data Strategy

- The public home page (`/`) reads one purpose-specific `GET /api/home-summary`: total/seasonal visits, catalog progress, combined magnet totals, and nullable `latestTrip` / `latestStandaloneVisit` / `featuredVisit` previews. Both home visit cards show the stored route detail with a route icon when present and omit that badge otherwise. Long route text wraps within the card. It does not fetch trip details or galleries. A retketön visit has no publicly visible trip association, including a published visit assigned to a draft trip; hidden trip metadata never reaches this preview. Selection follows trip start date or visit date with creation time and ID as descending ties.
- The control-panel home page reads `GET /api/admin/home-featured-visit` with admin auth and `no-store`, then offers an inline searchable picker for published visits at visible parks (including visits in trips). It matches case-insensitive place names, Finnish/ISO dates and years, combines space-separated terms, starts with ten recent visits, and appends ten with **Näytä lisää**. Native radio rows keep keyboard selection available; the selected visit remains visible above the results with **Poista valinta**, and filtering never clears it or saves changes. `PATCH` saves one nullable visit ID through the admin/CSRF-protected proxy. Saving immediately expires the shared public cache; a failed refresh offers a retry without repeating the write. The optional **Erityinen vierailu** section sits between statistics and about, uses the same visit memory card at full width with a lazy cover, a theme-aware diagonal **Tyytyväisyystakuu** ribbon at the card’s top right, and the shared **Takaisin alkuun** link, and renders nothing when unset, draft, hidden, or deleted. A saved selection that becomes unavailable remains clearable in admin; deletion clears its foreign key. No offline storage is added.
- Home and archive use `PublicMemoryCard` for the same aspect-video image surface flush with the card’s top and side edges, with padding only around the content below. Each card takes a date label rendered once at the cover’s top left on an opaque, theme-aware pill, including the missing/failed-image placeholder. The whole-card link uses its translated read-more hint as both the native `title` and screen-reader description (**Tutustu retkeen tarkemmin** / **Tutustu käyntiin tarkemmin**). Cards share the three-line excerpt (complete Markdown headings are omitted before the API shortens the text), focus/hover treatment, and failed-image placeholder. Latest-memory labels are h3 and titles h4; the special-visit section is h2 with its card title h3; archive titles remain h2. The two home featured covers and first four archive covers (two desktop rows) use eager image loading for the opening viewport; later archive covers, including appended pages, remain lazy. The shared card defaults to lazy loading. Cards disable detail prefetch; archive navigation state is saved only on ordinary clicks. The magnet progress row links to `/kaynnit?view=parks` and counts distinct visited national parks plus other magnet places, including a valid zero denominator.
- `public-page-styles.ts` shares the panel surface while separating padding: `PUBLIC_CONTENT_PANEL_CLASS_NAME` uses `p-3 sm:p-6` for the home statistics/about panels and the archive list/loading container. Heroes retain `PUBLIC_PANEL_CLASS_NAME` with `p-5 sm:p-6`; `sm` starts at 640px.
- The public map page (`/paikat`) reads `GET /api/map-summary`.
- The home and map pages call Next.js `connection()` before reading their summaries, keeping page rendering at request time so production builds do not need the backend. The summary requests remain explicit `force-cache` reads with `home-summary` and `map-summary` tags, so repeated public requests can reuse cached data until a successful mutation revalidates the tags and page paths.
- The public visits page (`/kaynnit`) reads `GET /api/visits-timeline`; its optional map view (`?view=map`) additionally reads `GET /api/map-summary` for marker coordinates, and its visited national parks view (`?view=parks`) joins the same map summary to the visit timeline so park logos and the current total national park count stay available server-side.
- Timeline visits expose an automatic nullable `featuredImage: { url }` containing the first ordered visit thumbnail (`displayOrder`, then image ID), including visits grouped into trips. No separate cover selection is stored. Existing image upload/reorder/delete invalidation refreshes the cover. The first two thumbnails in displayed timeline order load eagerly, sharing one budget across standalone visits and trip groups; imageless cards do not consume that budget. Later thumbnails, including appended batches, remain lazy. Images are unoptimized 480 px derivatives in reserved aspect-video surfaces flush with the card’s top and side edges; visit and trip detail links disable prefetch. Each image overlays the visit date at top left and the image count at top right on opaque theme-aware pills shared with the home/archive cards; names and remaining badges stay in padded content below. “Näytä käynti” is a screen-reader label and native hover title on each visit link. Imageless visits retain their padded date header.
- The timeline initially renders 12 chronological items and automatically appends 12 when its end comes within 400 px of the viewport, using the archive’s IntersectionObserver approach; a trip counts as one item and stays intact. Normal browsing has no load-more button. The loaded visit count is announced to screen readers and automatic loading preserves keyboard focus. Year/month/view changes reset the batch. The server still reads the complete lightweight timeline metadata for filters, maps and magnet history; this is rendering pagination, not API paging, so payload size still grows with history.
- Roll out this timeline response change API first, UI second, and expire the frontend `public-visits` cache with the authenticated revalidation flow (`expireImmediately: true`) so pre-field cached metadata is refreshed.
- The public trip archive (`/retket`) reads `GET /api/trips/archive` with an initial batch of 12 cards and appends later cursor batches through the same-origin `/api/trips/archive` proxy. The initial archive read is explicitly `force-cache`d with the shared `public-trips` tag because featured media now uses stable application URLs; later client-requested batches remain on-demand. The client never stores media URLs in Back navigation state and does not prefetch trip details.
- Public park detail pages read `GET /api/parks/{slug}` and `GET /api/parks/{slug}/visits` through explicit `force-cache` reads tagged with `public-park:{slug}`. The page remains request-time so builds do not need the backend, while hidden parks still fall back to authenticated `no-store` requests. The detail includes nullable `featuredImage` from a selected visit photo. Park editing saves this slot independently through admin/CSRF-protected `GET/PATCH /api/admin/parks/{slug}/featured-image`; the shared trip/park picker pages through `GET /api/admin/parks/{slug}/images` thumbnails in batches of 48. Only photos from published visits are offered and accepted by the API. The settings read includes lightweight `hasImages` availability without loading a gallery; the editor omits the entire **Pääkuva** section while checking availability and when no eligible photos exist. Withdrawing a source visit makes its saved cover unavailable. Saves/clears immediately expire the park cache; failed cache refresh can be retried without repeating the write. Cached detail payloads from before this field existed also retain the original hero during rollout. The top-aligned hero shares the trip title and metadata styles and the visits timeline’s `ParkTypeBadge`: **Paikka**, a responsive logo to the right of the title without an extra horizontal gap (centered above it when space is tight), type, establishment year and area values with hover/focus tooltips and screen-reader labels, copy-link, and a client-resolved admin edit link. It uses an eager decorative cover with a dark content layer and restores the panel if the cover fails. Address sits below the boundary map in the location section, which remains available without boundary geometry. The conditional **Kohteesta** section follows location and contains a nullable Markdown description, **Koetut vuodenajat** derived only from the server’s published visits (deduplicated in winter-to-autumn order, using the shared season emoji mapping also used by visit cards, home statistics, and year reviews), and website/PDF links under **Materiaalit**. Seasons appear in a distinct strip with shared emojis; materials sit in a separated footer with compact outlined external links. Empty groups disappear. The section and its navigation item require a description or experienced seasons; when both are absent, website/PDF links appear beneath the address in **Sijainti** without a materials heading. Admin history refreshes including drafts do not affect this summary. Shared `StickySectionNavigation` links to **Sijainti**, conditional **Kohteesta**, and **Vierailut** between hero and location details. No offline storage changes. Deploy API migrations `0043_park_featured_image.sql` and `0044_park_description.sql` and API before UI, then immediately expire cached public park details on rollout with the authenticated revalidation flow (`parkSlug`, `expireImmediately: true`). Description saves use the same immediate expiry; the API detail ETag includes a description representation version so old-shape validators cannot return 304.
- Public trip detail pages use an explicit `force-cache` read tagged with `public-trip:{slug}` and remain request-time so builds do not need the backend. The payload includes `route.available`, so a route map can render even when the visible itinerary is empty because private route waypoints are present; those waypoint records are never exposed to the public payload. When a visitor opens a visit or stop gallery, the same-origin private/no-store proxy requests only the corresponding `GET /api/trips/slug/{slug}/visits/{visitId}/images` or `GET /api/trips/slug/{slug}/stops/{stopId}/images` page. The API validates that the image parent belongs to that visible trip, returns a stable image order in pages of 12 (maximum 24), and keeps route planning out of gallery reads. The UI has loading, retry, and “show more” states for that one gallery and never reloads the trip or other parks' history for it.
- The sitemap (`src/app/sitemap.ts`) waits for `connection()` so it is generated at request time while its park and trip reads still use the shared `map-summary` and `public-trips` cache tags. It emits only clean Finnish public URLs and lets upstream failures surface instead of publishing a partial sitemap. `lastModified` is intentionally omitted because the public API does not provide authoritative modification timestamps for every sitemap resource.
- Admin-only quick links on public pages are resolved client-side with `useAuth`, so the page HTML can stay cache-friendly while signed-in users still see edit and add-visit affordances after hydration. Shared `EditIconLink` uses the same hover/focus tooltip as other icon controls, keeps its accessible name, and omits the native `title` to avoid duplicate tooltips in park, trip, visit, and admin list actions.
- Park/trip descriptions and visit notes share `MarkdownContent` (`ReactMarkdown` + GFM, theme-aware prose, preserved plain-text line breaks, safe URLs, no raw HTML) and the controlled `MarkdownEditor` with Markdown guidance, an accessible edit/preview toggle, and the existing 5,000-character counter. Park descriptions are public, manually authored detail data; the park form sends description only when changed, with `null` clearing it. Catalog lists and summaries do not carry descriptions.
- Visit and public park mutations call the local Next.js route `POST /api/revalidate-public-cache` so the frontend can invalidate cached public pages immediately after a successful write.
- Trip mutations also revalidate the archive route so new, renamed, deleted, or reassigned trips appear in the next archive request.

### MapLibre Worker (v6)

MapLibre GL v6 ships ESM-only and cannot auto-detect its worker URL inside the Next.js/Turbopack module graph. The app therefore self-hosts the worker:

- `scripts/copy-maplibre-worker.mjs` copies `maplibre-gl-worker.mjs` and its sibling `maplibre-gl-shared.mjs` from `node_modules` into `public/maplibre/` (gitignored) and runs automatically via the `predev` and `prebuild` npm hooks, so local dev, `npm run verify`, and Vercel builds all stay in sync with the installed `maplibre-gl` version.
- `src/components/map/map-worker.ts` calls `setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")`; it is imported by `src/components/map/map-style.ts`, which every map component already imports.
- The CSP `worker-src 'self' blob:` in `next.config.ts` covers the same-origin worker file.

### Public result-map point rendering

The public catalogue map (`/paikat`), visits map (`/kaynnit?view=map`), and trip-planner result map share the point-layer adapter in `src/components/map/map-point-layer.ts`. Visible places are one unclustered GeoJSON source rendered by a reusable MapLibre pin layer; they are not individual DOM markers or one popup per place. Each map keeps at most one active popup and updates the source data when filters or results change.

Canvas points are not individually keyboard-focusable. The header park search, visits-map result list, and trip-planner result list remain the accessible searchable or link-based alternatives for selecting a place. Trip-planner origin and destination pins remain small DOM markers because they are fixed endpoints, not catalogue-sized result sets.

### Optional map loading

Park boundary maps and public trip maps are wrapped in `src/components/map/deferred-map.tsx`. The boundary reserves the map's layout space and starts loading shortly before it enters the viewport. Generic optional maps keep an explicit accessible load button, while public trip maps mount automatically after hydration without a manual action and can show itinerary points before the separately loaded route line arrives. The same boundary exposes a low-power toggle that sets MapLibre's pixel ratio to `1`; disabling it restores the device pixel ratio. The primary `/paikat` map remains eager because the map is its main content.

### Growing public surfaces

Long public visit timelines progressively skip offscreen month sections with `content-visibility: auto` and an intrinsic placeholder size. Long public trip itineraries use the same treatment per itinerary item after the 12-item budget, while expanded visit details and galleries remain on demand. Review-story place cards also use browser-managed content visibility. Story-card navigation keeps the existing sticky navigation and reveal-anchor geometry; scroll synchronization is sampled once per animation frame and uses nearby cards while `IntersectionObserver` remains the primary active-card signal. Review-card glow motion is finite and activation-triggered, so it settles instead of running while the page is idle.

### Public navigation background work

The header disables automatic Next.js prefetching for the heavyweight public map, visits, and trip-planner routes. Navigation remains normal; intentional prefetching can be reconsidered if target-device measurements show a clear benefit. `useAuth` shares concurrent `/auth/session` requests and reuses the settled user or anonymous result for 30 seconds during client-side navigation; logout clears that cache. PWA caching remains unchanged.

---

## Authentication Flow

1. Header **"Kirjaudu"** links start `/auth/login?returnTo=<current public path>`, including the query and fragment; the login-page action starts `/auth/login` without a return destination
2. Frontend `/auth/login` validates the optional public return path and redirects to `/auth/google`
3. Frontend `/auth/google` forwards the validated `returnTo` to the API. The API stores it in a ten-minute `__oauth_return` cookie (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production), or clears an old destination when none is provided
4. Backend redirects to Google OAuth consent screen
5. Google returns to the API `/auth/google/callback` directly, or to its frontend proxy when the API's `GOOGLE_REDIRECT_URI` points there. Local ports 3004 and 4300 share the `localhost` cookie host
6. Backend verifies the Google token and database allowlist, sets `__session`, clears `__oauth_return`, and redirects directly to the public return path or canonical `/hallinta` when there is none. The frontend callback, when used, preserves the API's response
7. `useAuth` reads the frontend-only `/auth/session` endpoint, which returns `{ user }` including the current `isSuperAdmin` status for a valid session
8. `src/proxy.ts` verifies the cookie on every `/hallinta/*` request
9. Header shows **"Hallinta"** link when authenticated
10. Control panel has **"Kirjaudu ulos"** logout button

`GET /auth/session` returns `200 { user: null }` without a backend request when the session cookie is absent, empty, or malformed. With a cookie, it proxies the unchanged backend `/auth/me` endpoint to validate the session; a backend 401 also becomes `200 { user: null }`. Other backend errors retain their status, and network failures remain failures. All session responses use `Cache-Control: private, no-store` and remain network-only in the PWA. Public admin quick links still resolve after hydration; public page HTML and protected admin authorization are unchanged.

Login return destinations must be public paths of at most 2,048 characters on the configured frontend origin; external URLs, protocol-relative paths (including after dot-segment normalization), backslashes/control characters, and login, auth or control-panel destinations are rejected. The UI normalizes legacy public paths to Finnish URLs; the API independently validates the query and cookie. Login errors retain the backend's error redirect instead of returning to the public page. Auth-start and callback responses are private/no-store and remain network-only in the PWA. The control-panel home no longer performs a client-side return redirect or uses session storage for login destinations; this avoids rendering the dashboard and loading its admin data before returning to the public page. OAuth state, PKCE, allowlist checks, return destinations and session issuance remain owned by the API. Deploy the API's additive `/auth/google?returnTo=...` contract before this UI change. Deployments with separate API/UI cookie hosts must use the frontend callback configuration described by the API deployment guide.

### Local AI-agent login

Future AI agents can use the local-only shortcut without Google OAuth:

1. The API must have `LOCAL_AGENT_AUTH_ENABLED=true` and point at a development database safe for agent edits.
2. The API and UI must share the same `AUTH_JWT_SECRET` and run on ports `3004` and `4300`.
3. Open `http://localhost:4300/auth/dev-login` in the browser agent.

The frontend proxy forwards the backend's normal session cookie and redirects to `/hallinta`. The route is not shown in the UI, is loopback-only, is unavailable on Vercel, creates no admin database row, and does not grant super-admin access.

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
- For browser-side calls, uses same-origin frontend routes such as `/auth/session` and `/api/visits/:id`
- Sends cookies (`credentials: "include"`) in browser for auth and admin write endpoints
- Throws `ApiError` on non-2xx responses
- Handles empty-body 204 responses

The browser does **not** need direct access to `API_KEY`. Next.js route handlers relay browser auth and admin write requests to the backend and attach the server-side key there.

Use `apiPublicFetch<T>(path, options?)` for cacheable public server-side reads:

- Does **not** forward request cookies
- Can be tagged with Next.js cache tags for explicit revalidation after writes

Use `apiAuthFetch<T>(path, { cache: "no-store" })` for server-rendered admin reads. The trip and visit admin lists and edit pages use `/api/admin/*` projections that include drafts and stored publication status; public `/api/trips`, `/api/visits`, and park visit responses remain filtered to effectively public content. An authenticated admin's park page separately loads `/api/admin/parks/:slug/visits` through a no-store proxy, so draft visit rows and their **Luonnos** labels never enter the shared public response. The trip editor only offers published visits for new assignments; the API enforces the same rule. Browser preview route and gallery requests go through same-origin `proxyBackendRequest(..., { requireAdmin: true })` routes.

Saved-content previews live at the canonical Finnish URLs `/hallinta/kaynnit/[id]/esikatselu` and `/hallinta/retket/[id]/esikatselu`. Their English implementation routes are under `/control-panel/.../preview`. Both are dynamic, noindex, and fetch private no-store API data. Trip preview route and gallery requests use authenticated preview endpoints; preview images bypass Next image optimization so private signed URLs do not create shared derivatives. Public trip rendering keeps its existing anonymous endpoints and cache tags.

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
- Production CSP excludes `unsafe-eval`. The shared `src/lib/env.ts` module sets Zod's `jitless` mode in the browser before creating schemas, preventing its caught `Function("")` capability probe from generating a CSP violation. Server-side Zod compilation keeps its default setting.
- Backend fetches in `src/lib/api.ts` and `src/lib/backend-proxy.ts` use a 10-second `AbortSignal.timeout` so a hung backend cannot pin server components or route handlers; proxy timeouts surface as 504.
- `AUTH_JWT_SECRET` must be at least 32 characters; the env schema rejects shorter secrets at boot.

### Session Token Contract and Proxy AuthZ

- Session verification is centralized in `src/lib/session-auth.ts`. Tokens must be HS256-signed with `AUTH_JWT_SECRET`, carry `iss: "reissuvihko-api"` and `aud: "reissuvihko-ui"` (overridable via `AUTH_JWT_ISSUER` / `AUTH_JWT_AUDIENCE`), and contain the complete API identity shape: finite `exp`, non-empty `sub`, valid `email`, string `name` and `picture`, and `role: "admin"`. All claims are validated before admin shell access, backend mutations, or public-cache revalidation.
- `src/proxy.ts` gates `/hallinta/*` page shells on a valid session. Route handlers that proxy admin mutations additionally require the `role: "admin"` claim via `proxyBackendRequest(request, path, { requireAdmin: true })`; missing/invalid sessions get 401 and non-admin sessions 403. The Ylläpitäjät page also checks `isSuperAdmin` from `/auth/me`, and the backend repeats that authorization for every admin-management request.
- Admin-gated proxy routes: park mutations (`/api/parks/[slug]`, `/removed`, `/visits`), visit mutations (`/api/visits/[id]` and all image sub-routes), visit/trip admin list and detail reads, `GET/PATCH /api/admin/home-featured-visit`, park featured-image reads/writes and image-candidate reads under `/api/admin/parks/[slug]`, trip preview data/route/gallery reads, `GET /api/admin/parks/visibility`, `GET/PATCH/DELETE /api/admin/admins`, `POST /api/admin/invitations`, and `POST /api/revalidate-public-cache`. Public reads and the public trip-planner POSTs stay unauthenticated.
- Non-`GET` proxy and cache-revalidation requests must carry an `Origin` header whose complete origin (scheme, host, and port) matches the request origin; missing, malformed, or mismatched origins get 403 (CSRF defense-in-depth on top of the `SameSite=Lax` session cookie). Browser same-origin fetches supply this header automatically; no server-originated non-`GET` proxy caller is supported.
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
- **Use the shared dropdown component** — use `src/components/ui/select.tsx` (`Select`) for dropdowns instead of styling raw `<select>` elements independently. It provides the shared surface, chevron, focus treatment, and light/dark theme styling; keep the native control semantics and add a Finnish label from `messages/fi.json`.
- **Use the shared snackbar for transient notifications** — `src/components/providers/snackbar-provider.tsx` exposes `SnackbarProvider` and `useSnackbar` for reusable success/error notifications. It renders fixed bottom-left feedback with accessible status/alert semantics, automatic dismissal, and a manual close control. Keep field validation, blocking page errors, and persistent result content inline when users need them to continue the task.
- **Tailwind v4** — semantic tokens (`bg-background`, `text-primary`)
- **Metsä ja vesi theme** — keep app-wide light/dark paint tokens and gradients in `src/app/globals.css`, and reuse `src/components/ui/theme-styles.ts` for panel, memory, control, action, image-label and progress recipes. `IMAGE_OVERLAY_LABEL_CLASS_NAME` uses opaque `bg-control` / `text-foreground` surfaces with a border and soft shadow: ivory/forest in light mode, deep water/pale text in dark mode. Home/archive dates and timeline date/photo-count overlays share it; opacity preserves small-text contrast independently of the photo (measured 10.7:1 light, 9.1:1 dark). Public pages, maps, editors and review/share screens use the same forest/water system; replace local decorative color recipes rather than remapping Tailwind's stock palettes. Preserve original brand artwork, meaningful map/status/season colors, component geometry and interaction behavior. Use the shared native controls. Progress indicators share `PROGRESS_TRACK_CLASS_NAME` and `PROGRESS_FILL_CLASS_NAME` for rounded tracks, a visible input-colored outline in both themes and a full gradient on each fill; consumers keep their own heights, width calculations and semantics. Native upload progress uses `NATIVE_PROGRESS_CLASS_NAME` and the browser pseudo-element adapter in `globals.css` for the same paint.
- **Dark mode** — use `dark:` variants, test both themes

## PWA Assets

- The web app manifest is defined in `src/app/manifest.ts`
- The Serwist worker source lives in `src/app/sw.ts`
- The service worker route is exposed from `src/app/serwist/[path]/route.ts`
- App install icons are served from `src/app/icons/`
- The shared icon artwork and image responses live in `src/lib/pwa-icon.tsx`
- Changes to offline, caching, or service-worker registration behavior must be verified against the intended production experience and documented in the same PR.
- Runtime caching is intentionally narrow: only same-origin `/_next/static/` assets, app icons, and the favicon may enter Cache Storage. API, auth, admin, review-share, RSC/navigation, optimized-image, signed-media, and cross-origin requests are NetworkOnly. Worker activation removes the old broad runtime caches (`apis`, page/RSC, cross-origin, and image caches) while preserving the active precache and unrelated origin storage.
- Development disables worker registration and removes leftover registrations matching this app's worker URL, their scoped `serwist-precache-v2` caches and `public-static-v2`; unrelated caches, cookies and other browser storage are preserved. After running a local production build, hard-refresh once if normal refreshes combine stale client bundles with current server HTML. See [the PWA note](DEPLOYMENT.md#current-pwa-note).
- `@serwist/turbopack` currently pins Browserslist exactly. The root `browserslist` override holds its transitive build-tool dependency at the patched 4.28.9 release until Serwist ships a compatible update; do not remove it without rerunning `npm audit --omit=dev` and the production build.

---

## Backend Assumptions

- Port: **3004**
- Auth endpoints: `/auth/google`, `/auth/google/callback`, `/auth/dev-login` (local AI-agent use only), `/auth/me`, `/auth/logout`; `/auth/me` includes the current `isSuperAdmin` flag. Invitation links use `/auth/google?invite=<token>` and the same OAuth callback.
- API endpoints: `/api/parks`, `/api/parks/{slug}`, `/api/parks/{slug}/visits`, `/api/parks/{slug}/removed`, `/api/visits`, `/api/visits/{id}`, `/api/admin/visits`, `/api/admin/trips`, and `/api/admin/trips/{id}/preview/*`
- Frontend tag-cached reads (API publication summaries remain `private, no-store`): `/api/home-summary`, `/api/map-summary`, `/api/visits-timeline`
- Catalog and visit `GET` data is public to end users through the frontend, but direct backend `/api/*` access generally requires the server-side API key outside localhost. Backend-anonymous reads are limited to `GET /health`, `GET /openapi.json`, and `GET /assets/logos/*`; admin mutations require an authenticated admin session, with the documented public trip-planner POSTs as the deliberate exception.
- OpenAPI doc: `http://localhost:3004/openapi.json`
- Trips and visits use independent `draft` / `published` status. New UI forms offer immediate publication and private draft saving; withdrawal hides each record without deleting it. A published visit remains public when assigned to a draft trip, while its trip relationship stays private until the trip is published.
- API status behavior must be deployed before the UI: migration `0040` keeps existing rows published, while new API creates without status default to draft. Keep the admin editing pause described in the API deployment guide during the API/UI deployment gap.

## Production Deployment Notes

- The frontend expects `NEXT_PUBLIC_API_URL`, `API_KEY`, `AUTH_JWT_SECRET`, and `TRIP_PLANNER_CLIENT_SECRET` to be set in Vercel.
- `AUTH_JWT_SECRET` must match the backend exactly so `src/proxy.ts` and `src/lib/session-auth.ts` can verify the session JWT. The token's `iss`/`aud` claims must also match `AUTH_JWT_ISSUER` / `AUTH_JWT_AUDIENCE` (defaults `reissuvihko-api` / `reissuvihko-ui`).
- `TRIP_PLANNER_CLIENT_SECRET` is server-only and must be at least 32 characters. In production the proxy derives the opaque planner client ID from Vercel's platform-overwritten `x-vercel-forwarded-for` header using HMAC-SHA256; it rejects planner requests when that header or secret is missing. Do not expose the UI origin outside Vercel or substitute an arbitrary `x-forwarded-for` value. The identity is intentionally not logged or stored as a raw network identifier.
- For production auth, prefer custom domains such as `app.example.com` and `api.example.com` over two separate default `*.vercel.app` domains.
- See [docs/DEPLOYMENT.md](./DEPLOYMENT.md) for the full deployment checklist.
