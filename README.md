# Finnish National Parks UI

Next.js 16 frontend for exploring Finnish national parks and managing personal visits.

## Overview

This is a Finnish-language, PWA-capable web application built with Next.js 16 App Router. It connects to a separate Hono backend API running at `http://localhost:3004`.

The app serves two audiences:

- **Public view** — Visit-focused landing page at `/`, interactive map at `/paikat` with park filters, a visited/unvisited toggle, and current-location targeting, visit browsing at `/kaynnit` as a timeline or a visit map with year and month filters, persistent park search, park detail pages under `/paikka/[slug]`, route planning at `/reissusuunnittelu`, and public visit history
- **Admin view** — Adding and editing visits, including excluding individual trip visits from route calculation, editing park details, and hiding parks from the catalog via `/hallinta`, including the shared map view with current-location targeting and admin-only access to hidden park detail pages

## Tech Stack

| Layer         | Choice                                        |
| ------------- | --------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack)            |
| Language      | TypeScript (strict mode)                      |
| Styling       | Tailwind CSS v4                               |
| UI Primitives | Custom components with Radix-style patterns   |
| Theming       | `next-themes` (dark / light / system)         |
| Icons         | Lucide React                                  |
| Map           | MapLibre GL JS                                |
| API Client    | Typed fetch wrapper + OpenAPI-generated types |
| State         | React hooks (Context + useReducer / useState) |
| PWA           | `@serwist/turbopack` (Turbopack-compatible)   |
| i18n          | `next-intl` (Finnish default, extensible)     |
| Testing       | Vitest + React Testing Library + Playwright   |
| Lint / Format | Biome                                         |

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (user)/                 # Public pages; implementations live in English-named
│   │   │                       # dirs (parks/, park/[slug]/, visits/, trip-planner/),
│   │   └── paikat|kaynnit|…    # canonical Finnish routes are one-line re-export shims
│   ├── control-panel/          # Admin page implementations (English-named)
│   ├── hallinta/               # Canonical Finnish admin routes (shims of control-panel/)
│   ├── login|kirjaudu/         # Login implementation + Finnish shim
│   ├── api/                    # Route handlers proxying the Hono backend
│   ├── serwist/[path]/         # Service worker route (PWA)
│   ├── error.tsx               # Shared route error boundary (per segment)
│   ├── layout.tsx              # Root layout with providers
│   └── globals.css             # Tailwind v4 + CSS variables
├── components/
│   ├── layout/                 # Header, theme toggle, shared error fallback
│   ├── map/                    # MapLibre wrapper
│   ├── providers/              # Theme, Serwist, i18n providers
│   └── ui/                     # Button, inputs, cards
├── hooks/                      # Custom React hooks
├── lib/                        # API client, env validation, auth
├── i18n/request.ts             # next-intl request config
└── test/                       # Test setup & helpers
```

Canonical URLs are Finnish-only (`/paikat`, `/kaynnit`, `/paikka/[slug]`, `/reissusuunnittelu`, `/hallinta`, `/kirjaudu`). Legacy English URLs redirect to the Finnish canonical routes via `legacyAppRedirects` in `src/lib/routes.ts`.

## Getting Started

### Prerequisites

- Node.js 20+
- Backend API running at `http://localhost:3004`

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:3004
API_KEY=your-hono-api-key
AUTH_JWT_SECRET=at-least-32-characters-shared-secret
NEXT_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

The frontend keeps `API_KEY` server-side. Browser auth and admin write requests are proxied through Next.js route handlers, so visitors do not need the backend key in client-side JavaScript.

### Development

```bash
npm run dev
```

The dev server runs on **port 4300** by default: `http://localhost:4300`

### Quality Gates

```bash
npm run verify        # typecheck + lint + unit tests + build
npm run typecheck     # Clear generated Next types, regenerate them, then run TypeScript strict check
npm run lint          # Biome lint check + Tailwind canonical class check
npm run lint:fix      # Biome auto-fixes + Tailwind canonical class fixes
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright E2E (chromium only)
npm run test:e2e:all  # Playwright E2E (all browsers)
```

Pull requests targeting `main` run the same `npm run verify` gate in GitHub Actions.

### Build

```bash
npm run build
npm start
```

## API Integration

Types are auto-generated from the backend OpenAPI spec:

```bash
npm run generate:api-types
```

The backend exposes its spec at `http://localhost:3004/openapi.json`.

## Deployment

Vercel deployment notes live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Contributor Docs

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for local workflow, architecture, and contributor guardrails
- [docs/TESTING.md](docs/TESTING.md) for behavior-first testing and verification expectations
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production and Vercel setup
- [AGENTS.md](AGENTS.md) for repo-specific AI and contributor workflow rules

## PWA

The app includes Progressive Web App infrastructure using `@serwist/turbopack`, which is compatible with Next.js 16's default Turbopack bundler. Production builds register the service worker, while development keeps registration disabled to avoid cache interference during local iteration.

Current PWA support includes:

- Web app manifest with standalone display mode
- Serwist-powered service worker and offline document fallback at `src/app/~offline/page.tsx`
- Route-served install icons under `src/app/icons/`
- Dedicated favicon and Apple touch icon metadata

## Conventions

- **Arrow functions only** — Enforced via Biome (`useArrowFunction: error`)
- **Canonical Tailwind classes** — Prefer Tailwind's canonical utility names such as `max-w-none!`, `rounded-3xl`, `pt-6.5`, and `h-104` instead of equivalent non-canonical arbitrary or prefixed forms; `npm run lint` and `npm run lint:fix` enforce this
- **Finnish UI copy** — All user-facing text is in Finnish via `next-intl`
- **Finnish canonical URLs** — Public and admin page routes use Finnish slugs such as `/paikat`, `/kaynnit`, `/paikka/[slug]`, `/reissusuunnittelu`, and `/hallinta`; legacy English URLs still redirect
- **Accessibility first** — Semantic HTML, ARIA labels, keyboard navigation, `prefers-reduced-motion` support
- **Backend boundary is sacred** — No direct DB access; all data flows through the Hono API
- **Security and sustainability are defaults** — Guard mutation routes, keep secrets server-only, allowlist external origins narrowly, and document cache or offline behavior changes in the same PR
