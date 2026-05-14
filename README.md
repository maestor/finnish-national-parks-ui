# Finnish National Parks UI

Next.js 16 frontend for exploring Finnish national parks and managing personal visits.

## Overview

This is a Finnish-language, PWA-capable web application built with Next.js 16 App Router. It connects to a separate Hono backend API running at `http://localhost:3004`.

The app serves two audiences:

- **Public view** — Interactive map for browsing parks and viewing visit history
- **Admin view** — Adding and editing visits, notes, and park details via `/control-panel`

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| UI Primitives | Custom components with Radix-style patterns |
| Theming | `next-themes` (dark / light / system) |
| Icons | Lucide React |
| Map | MapLibre GL JS |
| API Client | Typed fetch wrapper + OpenAPI-generated types |
| State | React hooks (Context + useReducer / useState) |
| PWA | `@serwist/turbopack` (Turbopack-compatible) |
| i18n | `next-intl` (Finnish default, extensible) |
| Testing | Vitest + React Testing Library + Playwright |
| Lint / Format | Biome |

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (user)/                 # Public map & park views
│   ├── control-panel/          # Admin routes
│   ├── serwist/[path]/         # Service worker route (PWA)
│   ├── layout.tsx              # Root layout with providers
│   └── globals.css             # Tailwind v4 + CSS variables
├── components/
│   ├── layout/                 # Header, theme toggle
│   ├── map/                    # MapLibre wrapper
│   ├── providers/              # Theme, Serwist, i18n providers
│   └── ui/                     # Button, inputs, cards
├── hooks/                      # Custom React hooks
├── lib/                        # API client, env validation, auth
├── i18n/request.ts             # next-intl request config
└── test/                       # Test setup & helpers
```

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
NEXT_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

### Development

```bash
npm run dev
```

The dev server runs on **port 4300** by default: `http://localhost:4300`

### Quality Gates

```bash
npm run verify        # typecheck + lint + unit tests
npm run typecheck     # TypeScript strict check
npm run lint          # Biome lint & format check
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright E2E (chromium only)
npm run test:e2e:all  # Playwright E2E (all browsers)
```

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

## PWA

The app is configured as a Progressive Web App using `@serwist/turbopack`, which is compatible with Next.js 16's default Turbopack bundler. The service worker is disabled in development and built automatically in production.

## Conventions

- **Arrow functions only** — Enforced via Biome (`useArrowFunction: error`)
- **Finnish UI copy** — All user-facing text is in Finnish via `next-intl`
- **Accessibility first** — Semantic HTML, ARIA labels, keyboard navigation, `prefers-reduced-motion` support
- **Backend boundary is sacred** — No direct DB access; all data flows through the Hono API

## Roadmap

- *Empty — all planned features are implemented.*
