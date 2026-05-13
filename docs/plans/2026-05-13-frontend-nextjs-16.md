# Frontend Plan: Next.js 16 National Parks UI

## Goal

Create a new repository for the Finnish National Parks frontend: a Next.js 16 application that consumes the existing Hono backend API. The frontend serves two audiences:

1. **Public / User view** — Interactive map for browsing parks and viewing visit history
2. **Admin view** — Adding and editing visits, notes, and park details

This plan covers the architectural foundations, tooling choices, and base structure. Exact feature specifications for user and admin flows are out of scope here.

---

## Architecture

```
┌─────────────────────────────┐         HTTP/REST          ┌─────────────────────────────┐
│  Hono API (existing repo)   │  ◄──────────────────────►  │  Next.js 16 (new repo)      │
│  - /parks (catalog)         │     OpenAPI + API key      │  - App Router               │
│  - /personal/parks          │                            │  - PWA-capable              │
│  - /health                  │                            │  - Dark mode + a11y         │
└─────────────────────────────┘                            └─────────────────────────────┘
           │                                                            │
           └──────────────────────┬─────────────────────────────────────┘
                                  │
                           ┌───────────────┐
                           │  libSQL/Turso │
                           └───────────────┘
```

- **Backend boundary is sacred.** The Next.js app calls the Hono API via HTTP. No database access, no Server Actions that bypass the API.
- **Type-safe API client** generated from the backend OpenAPI spec.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 16 (App Router) | Latest stable, Turbopack default, mature ecosystem |
| Language | TypeScript | Shared with backend; strict mode on |
| Styling | Tailwind CSS v4 | De facto Next.js standard; excellent dark mode support; zero-runtime |
| UI Primitives | shadcn/ui or Radix UI | Accessible, unstyled headless components; works with Tailwind |
| Theming | `next-themes` | Handles `prefers-color-scheme`, localStorage persistence, no flash |
| Icons | Lucide React | Lightweight, consistent, tree-shakeable |
| Map | MapLibre GL JS | Open-source, no API key needed, works offline for PWA |
| API Client | `openapi-typescript` + thin fetch wrapper | Generates types from backend OpenAPI JSON; runtime validation via Zod if desired |
| State | React Context + `useReducer` / `useState` | Personal project scale; avoid heavy state libraries until proven needed |
| PWA | `next-pwa` (or manual service worker) | Manifest, icons, offline shell |
| Testing | Vitest + React Testing Library + Playwright | Unit for pure logic; E2E for critical flows (map, visit CRUD) |

---

## Project Structure

```
finnish-national-parks-ui/
├── public/
│   ├── manifest.json
│   ├── icons/
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   └── ...
├── src/
│   ├── app/
│   │   ├── (user)/                 # Route group: public map & park views
│   │   │   ├── page.tsx            # / — Finland map with park markers
│   │   │   ├── park/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx    # /park/:slug — Park detail (read-only)
│   │   │   └── layout.tsx          # User layout: full-width, no sidebars
│   │   ├── control-panel/          # Route group: admin
│   │   │   ├── page.tsx            # /control-panel — Dashboard / visit list
│   │   │   ├── visits/
│   │   │   │   ├── page.tsx        # /control-panel/visits
│   │   │   │   └── new/
│   │   │   │       └── page.tsx    # /control-panel/visits/new
│   │   │   └── layout.tsx          # Admin layout: sidebar + header
│   │   ├── layout.tsx              # Root layout: providers, theme, metadata
│   │   └── globals.css             # Tailwind directives + CSS variables
│   ├── components/
│   │   ├── map/                    # MapLibre wrapper, markers, popups
│   │   ├── ui/                     # Buttons, inputs, cards (shadcn/Radix based)
│   │   ├── visits/                 # Visit list, forms, date pickers
│   │   └── layout/                 # Header, footer, sidebar, theme toggle
│   ├── lib/
│   │   ├── api.ts                  # Typed fetch client to Hono backend
│   │   ├── api-types.ts            # Generated from OpenAPI (do not hand-edit)
│   │   ├── auth.ts                 # API key storage/retrieval
│   │   └── env.ts                  # Zod-validated env vars (API_URL, API_KEY)
│   └── hooks/
│       ├── use-parks.ts            # SWR/React Query style data fetching
│       ├── use-visits.ts
│       └── use-theme.ts            # Wraps next-themes if needed
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── biome.json (or eslint/prettier)
└── package.json
```

### Route Group Rules

- `(user)` group is **not** reflected in URL. Pages inside appear at `/` and `/park/:slug`.
- `control-panel` is a real URL segment. All admin pages are prefixed with `/control-panel`.
- Each group has its own `layout.tsx` for distinct chrome (full-screen map vs. admin sidebar).

---

## CSS & Theming (Dark Mode)

### Approach

Use **Tailwind CSS v4** with CSS variables for theming. Tailwind's `darkMode: 'class'` strategy integrates cleanly with `next-themes`.

### Behavior

1. **Auto-detect on first visit:** Read `prefers-color-scheme` media query.
2. **Persist user choice:** Store override in `localStorage`.
3. **No flash on load:** `next-themes` injects a blocking script before React hydrates to set the correct class on `<html>`.
4. **Toggle available:** A sun/moon icon in the header allows manual override.

### CSS Variables

Define semantic tokens in `globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 142 76% 36%;
  --primary-foreground: 0 0% 100%;
  /* ... */
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 142 71% 45%;
  --primary-foreground: 0 0% 100%;
  /* ... */
}
```

Tailwind maps these to utility classes via `tailwind.config.ts`:

```ts
colors: {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
  // ...
}
```

Map components (markers, lines) must read the current theme and switch tile layers or colors accordingly.

---

## PWA (Progressive Web App)

### Requirements

- Installable on mobile home screens
- Works offline in a degraded mode (at minimum, shows cached park list)
- Respects user's data — no aggressive background sync needed

### Implementation

1. **`manifest.json`** with:
   - `name`: "Finnish National Parks"
   - `short_name`: "National Parks"
   - `start_url`: "/"
   - `display`: "standalone"
   - `theme_color`: matches primary brand color
   - `background_color`: matches light/dark background
   - Icons at 192x192 and 512x512

2. **Service Worker** via `next-pwa` or Workbox:
   - Cache static assets (JS, CSS, icons)
   - Cache API responses for `/parks` list with a stale-while-revalidate strategy
   - Do NOT cache personal data (visits, notes) — always fetch fresh
   - Show an offline fallback page if the user has no cached data

3. **`next.config.ts`**:
   ```ts
   import withPWA from 'next-pwa';
   export default withPWA({
     dest: 'public',
     register: true,
     skipWaiting: true,
     disable: process.env.NODE_ENV === 'development'
   });
   ```

4. **Viewport meta tag** for mobile scaling in root layout.

---

## Accessibility (a11y)

### Standards

Target **WCAG 2.1 AA** as a baseline. This is a personal project, but accessibility benefits all users and is legally prudent if shared publicly.

### Key Areas

1. **Map Accessibility**
   - Provide a **textual list view** as an alternative to the map (already planned)
   - Ensure markers are keyboard-focusable and have `aria-label` with park name
   - Offer a "skip map" link for keyboard users
   - Respect `prefers-reduced-motion` for zoom/pan animations

2. **Color Contrast**
   - All text meets 4.5:1 ratio in both light and dark modes
   - Map markers use distinct shapes + colors (not color alone)

3. **Forms (Admin)**
   - All inputs have associated `<label>` elements
   - Error messages linked via `aria-describedby`
   - Focus management: return focus to trigger after modal closes
   - Date pickers must be keyboard-navigable

4. **Semantic HTML**
   - Use `<main>`, `<nav>`, `<article>`, `<header>`, `<footer>` appropriately
   - Page `<title>` updates per route
   - Heading hierarchy (`h1` → `h2` → `h3`) is logical and never skips levels

5. **Tools**
   - Manual testing with keyboard-only navigation
   - axe DevTools in browser
   - Automated a11y checks in Playwright E2E tests (if feasible)

---

## API Integration

### Type Generation

1. Backend exposes OpenAPI spec at `/openapi.json`.
2. Frontend generates types:
   ```bash
   npx openapi-typescript https://api.example.com/openapi.json -o src/lib/api-types.ts
   ```
3. Commit `api-types.ts` and regenerate when backend contracts change.

### Runtime Client

A thin wrapper around `fetch` in `src/lib/api.ts`:

```ts
// Conceptual — implement with proper error handling
const apiFetch = <T>(path: string, options?: RequestInit): Promise<T> => {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      ...options?.headers
    }
  }).then(res => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });
};
```

### Data Fetching Pattern

- **Server Components:** Use `apiFetch` directly for initial data (park list, single park). Cache with Next.js `fetch` options or `"use cache"` directive where appropriate.
- **Client Components:** Use a lightweight fetching hook (custom SWR-style or TanStack Query if complexity grows) for mutations and real-time map data.
- **Mutations (visits):** POST/PUT/DELETE via client-side fetch with optimistic UI if desired.

---

## Feature Overview

### User Part (`/` and `/park/:slug`)

- **Finland map** with all national parks as interactive markers
- **Marker states:** Visited (green), Not visited (gray), Selected (highlighted)
- **Popup on click:** Park name, type, quick stats
- **Park detail page (`/park/:slug`):**
  - Full info from catalog (name, type, municipality, description)
  - Visit history timeline
  - Personal notes (read-only for public view)
  - Link to official Luontoon.fi page
- **List view toggle:** Accessible alternative to map
- **Filtering:** By park type, visit status, region

### Admin Part (`/control-panel/*`)

- **Dashboard:** Summary stats (total visits, parks visited, last visit)
- **Visit management:**
  - List all visits chronologically
  - Add new visit (date picker, park selector, notes)
  - Edit existing visit
  - Delete visit with confirmation
- **Note management:**
  - Add/edit notes per park
- **Park catalog sync trigger:** Button to trigger backend import (optional — may stay CLI-only)
- **Settings:** API key input, theme toggle

---

## Environment Variables

```env
# Required
NEXT_PUBLIC_API_URL=https://your-api.vercel.app
API_KEY=your-hono-api-key

# Optional
NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.example.com/style.json
```

- `NEXT_PUBLIC_*` prefix only for values truly needed in browser (map style URL, maybe API base URL).
- `API_KEY` is server-side only if used in Server Components; if client-side fetch is used, it must be public. Given this is a personal tool with API key auth, the key will likely be in the client — accept this threat model or proxy through a Next.js Route Handler.

**Security note:** Consider a thin Next.js Route Handler at `/api/proxy/*` that forwards requests to the Hono backend with the API key injected server-side. This hides the key from the browser. Evaluate if the added complexity is worth it for a personal project.

---

## Development & Deployment

### Local Dev

```bash
npm install
npm run dev        # Turbopack dev server
```

Backend must be running locally (or use staging URL) for API calls.

### Quality Gates

- `npm run typecheck` — TypeScript strict mode
- `npm run lint` — Biome or ESLint (match backend style if possible)
- `npm run test` — Vitest unit tests
- `npm run test:e2e` — Playwright E2E (critical flows only)
- `npm run verify` — Runs all of the above

### Deployment

- **Target:** Vercel
- **Branch-based previews:** Every PR gets a preview deployment
- **Production:** Auto-deploy on merge to `main`
- **Environment variables:** Configured in Vercel dashboard per environment

---

## Out of Scope (for this plan)

- Exact UI mockups or wireframes
- Specific map tile provider choice (beyond MapLibre GL recommendation)
- Backend changes — the API contract is assumed stable
- Multi-user auth (beyond single API key)
- Image upload for visits
- Social sharing features
- Analytics / telemetry

---

## References

- [Backend API Contract](../../src/routes/parks.ts) — Source of truth for data shapes
- [Backend OpenAPI Spec](http://localhost:3004/openapi.json) — Generate frontend types from here
- [Next.js 16 Docs](https://nextjs.org/docs)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/)
