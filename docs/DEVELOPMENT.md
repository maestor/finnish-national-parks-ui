# Development Guide

## Project Overview

**Finnish National Parks UI** is a Next.js 16 App Router application that consumes a separate Hono backend API. It serves two audiences:

- **Public visitors** — an interactive map of Finnish national parks
- **Admin users** — a control panel for managing park visit history and notes

Authentication is Google OAuth with an allowlist managed by the backend.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 + CSS variables |
| UI Icons | Lucide React |
| i18n | next-intl (Finnish `fi` hardcoded) |
| Theme | next-themes (dark/light/system) |
| PWA | Serwist |
| Testing | Vitest + jsdom, Testing Library, Playwright |
| Lint/Format | Biome |
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
```

The `AUTH_JWT_SECRET` must match the backend's `AUTH_JWT_SECRET` exactly.

---

## Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server on `http://localhost:4300` |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run lint` | Biome lint check |
| `npm run lint:fix` | Auto-fix Biome issues |
| `npm run test` | Run Vitest unit/component tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Run Playwright E2E (Chromium only) |
| `npm run test:e2e:all` | Run Playwright E2E (all browsers) |
| `npm run verify` | Full gate: typecheck → lint → test → build |
| `npm run generate:api-types` | Regenerate `src/lib/api-types.ts` from backend OpenAPI |

**Always run `npm run verify` before asking for review.**

---

## Architecture

### App Router Structure

```
src/app/
  (user)/           # Public routes (grouped, no layout effect)
    page.tsx        # Map frontpage
    park/[slug]/    # Park detail pages
  control-panel/    # Admin routes (protected by proxy)
    layout.tsx      # Sidebar layout
    page.tsx        # Dashboard
    visits/         # Visit management
  login/            # OAuth login page
  proxy.ts          # Route protection (Next.js 16 proxy convention)
```

### Server vs Client Components

- **Server Components** (default): Use `getTranslations` from `next-intl/server`
- **Client Components**: Mark with `"use client"`, use `useTranslations` from `next-intl`
- **Pages**: Default exports only
- **Everything else**: Named exports

### Data Flow

```
Browser → Next.js App → apiFetch() → Hono Backend (:3004)
                ↓
         Proxy verifies JWT cookie
                ↓
         Control-panel routes protected
```

The backend handles:
- Google OAuth flow (`/auth/google`, `/auth/google/callback`)
- Session cookie (`__session` JWT)
- Park catalog API (`/api/parks`)
- Personal data API (`/api/me/*`) — visits, notes

---

## Authentication Flow

1. User clicks **"Kirjaudu"** → goes to `/login`
2. Clicks **"Kirjaudu Googlella"** → redirects to backend `/auth/google`
3. Backend redirects to Google OAuth consent screen
4. Google redirects back to backend `/auth/google/callback`
5. Backend validates allowlist, sets `__session` cookie, redirects to `/control-panel`
6. `src/proxy.ts` verifies the cookie on every `/control-panel/*` request
7. Header shows **"Hallinta"** link when authenticated
8. Control panel has **"Kirjaudu ulos"** logout button

---

## API Client

Use `apiFetch<T>(path, options?)` from `src/lib/api.ts`:

```typescript
import { apiFetch } from "@/lib/api";

// GET
const parks = await apiFetch<{ parks: Park[] }>("/api/parks");

// POST
const visit = await apiFetch<Visit>("/api/me/parks/pallas/visits", {
  method: "POST",
  body: JSON.stringify({ visitedOn: "2024-06-15" }),
});
```

- Automatically sends `Authorization: Bearer <API_KEY>` header
- Sends cookies (`credentials: "include"`) in browser for auth endpoints
- Throws `ApiError` on non-2xx responses
- Handles empty-body 204 responses

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

## Coding Conventions

See `AGENTS.md` for the full convention list. Key rules:

- **Arrow functions only** — no `function` declarations
- **Strict TypeScript** — no `any` without justification
- **Finnish UI copy** — all user-facing text in `messages/fi.json`
- **Accessible by default** — semantic HTML, `aria-label` on icon buttons, visible focus
- **Tailwind v4** — semantic tokens (`bg-background`, `text-primary`)
- **Dark mode** — use `dark:` variants, test both themes

---

## Backend Assumptions

- Port: **3004**
- Auth endpoints: `/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/logout`
- API endpoints: `/api/parks`, `/api/parks/{slug}`, `/api/me/*`
- OpenAPI doc: `http://localhost:3004/openapi.json`
