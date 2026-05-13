# Agent Instructions

## Project Context

This is the **Finnish National Parks UI** — a Next.js 16 App Router application consuming a Hono backend API. It is a personal project with two main audiences: a public map view and an admin control panel.

## Coding Conventions

### Arrow Functions Only

All function definitions must use `const` arrow functions. Pure `function` declarations are not allowed.

```tsx
// ✅ Correct
const MyComponent = () => { ... };

// ❌ Incorrect
function MyComponent() { ... }
```

This is enforced by Biome (`useArrowFunction: error`).

### TypeScript Strict

Strict mode is enabled. No `any` without explicit justification. All env vars are Zod-validated.

### Component Structure

- Server Components: Use `getTranslations` from `next-intl/server` for text
- Client Components: Mark with `"use client"` and use `useTranslations` from `next-intl`
- Default exports for page components only; use named exports for everything else

### Styling

- Tailwind CSS v4 with CSS variables for theming
- Semantic color tokens (`bg-background`, `text-foreground`, `text-primary`)
- Dark mode support via `next-themes` with `dark` class strategy

### Accessibility

- Every interactive control needs an accessible name
- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<button>`, `<a>`)
- Icon-only buttons must have `aria-label`
- Respect `prefers-reduced-motion`
- Keyboard focus must be visible and intentional

## Backend Boundary

The Next.js app calls the Hono API via HTTP. **No database access**, no Server Actions that bypass the API. The API client is in `src/lib/api.ts` and uses Bearer auth.

Backend is assumed to be running at `http://localhost:3004`.

## Localization

- Default locale is **Finnish (`fi`)** — all UI copy is in Finnish
- Translation keys live in `messages/fi.json`
- Tests should use translation keys via `I18nProvider` test helper
- Future languages can be added by creating new message files and updating `src/middleware.ts`

## Pre-installed Skills

The following agent skills are available in `.agents/skills/` and should be consulted when relevant work is done:

| Skill | When to Use |
|-------|-------------|
| `accessibility-first-ui` | Any UI component or layout change |
| `api-contract-sync` | Backend API changes, type regeneration |
| `browser-ui-verification` | Visual or responsive verification needed |
| `intelligence-testing` | Adding or modifying tests |
| `local-first-verification` | Deciding verification strategy for a change |

Skills are referenced from the project root. If they need to be moved to comply with different conventions, update this file.

## Environment Assumptions

- Dev server port: **4300** (`npm run dev`)
- Backend port: **3004**
- Playwright E2E base URL: `http://localhost:4300`

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | Typed fetch client to Hono backend |
| `src/lib/env.ts` | Zod-validated environment variables |
| `src/lib/api-types.ts` | Auto-generated from backend OpenAPI |
| `src/i18n/request.ts` | `next-intl` request-scoped config |
| `src/middleware.ts` | Locale routing middleware |
| `src/app/sw.ts` | Serwist service worker |
| `messages/fi.json` | Finnish translation messages |
