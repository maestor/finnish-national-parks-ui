# Agent Instructions

## Start of Session

When beginning work on this project, **read these documents first** (in order):

1. `docs/DEVELOPMENT.md` — setup, architecture, scripts, auth flow
2. `docs/TESTING.md` — testing strategy, TDD workflow, project-specific patterns
3. `README.md` — if you need human-oriented context

Then consult this `AGENTS.md` for coding conventions and workflow rules.

## Project Context

This is the **Finnish National Parks UI** — a Next.js 16 App Router application consuming a Hono backend API. It is a personal project with two main audiences: a public map view and an admin control panel.

## Git and Change Hygiene

- **PR-based workflow:** All changes must be developed on a dedicated branch (`feature/<name>`, `bugfix/<name>`, `chore/<name>`, `docs/<name>`, etc.) and submitted as a pull request against `main`. Do not push directly to `main`.
- **Commit conventions:** Use meaningful, independent commits with descriptive prefixes:
  - `Feature:` — new behavior or endpoints
  - `Fix:` — bug fixes
  - `Chore:` — tooling, dependencies, config
  - `Docs:` — documentation updates
  - `Refactor:` — code restructuring without behavior change
  - `Test:` — test-only changes
- A single PR may contain multiple commits.
- **Quality gate:** `npm run verify` must pass before any task or PR is considered ready. The only exception is changes that are entirely outside what `verify` validates — for example, pure documentation updates (README, DEVELOPMENT, TESTING, AGENTS, plans) or repository configuration that does not affect code, tests, or types. In those cases, skip `verify` and note the exception in the PR description.
- **Review requirement:** User review and explicit acceptance are required before merging.
- Keep documentation-only changes separate from implementation changes when practical.
- Do not revert user changes.
- Do not hand-edit generated files once generation exists.
- Keep changes scoped to the current request.

## Workflow

### Do Not Launch Dev Server

**Never start `npm run dev` or any local server on your own.** If a running dev server is needed for browser verification, testing, or any other purpose, use an existing one or ask the user to launch it. Do not leave background processes running.

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
- Future languages can be added by creating new message files and updating `src/i18n/request.ts`

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
| `src/i18n/request.ts` | `next-intl` request config (locale hardcoded to `fi`) |
| `src/app/sw.ts` | Serwist service worker |
| `messages/fi.json` | Finnish translation messages |
