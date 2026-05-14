# Agent Instructions

## Start of Session
1. Read `docs/DEVELOPMENT.md` for setup, architecture, scripts, and auth flow.
2. Read `docs/TESTING.md` for testing strategy, TDD workflow, and project-specific patterns.
3. Read `README.md` if you need human-oriented context.
4. Then use this file for repo-specific conventions and overrides.

## Shared Skills
- Use `$project-documentation` when updating `README.md`, `docs/**`, contributor guidance, or repository workflow docs.
- Use `$git-pr-workflow` for the standard branch, review, final-verify, commit, push, and PR-notes flow.
- Use installed project skills from `.agents/skills/` when they match the work:
  - `accessibility-first-ui`
  - `api-contract-sync`
  - `browser-ui-verification`
  - `intelligence-testing`
  - `local-first-verification`

## Project Context
This is the Finnish National Parks UI, a Next.js 16 App Router application consuming a Hono backend API for a public map view and an admin control panel.

## Repo-Specific Workflow Overrides
- Branches must follow the repo naming convention: `feature/<name>`, `bugfix/<name>`, `chore/<name>`, `docs/<name>`, `refactor/<name>`, or `test/<name>`.
- All changes are PR-based against `main`. Do not push directly to `main`.
- `npm run verify` must pass before any task or PR is considered ready, except for pure documentation or repo-configuration changes that cannot affect code, tests, or generated types.
- For docs-only skips, note the exception in the PR description.
- User review and explicit acceptance are required before merge.
- Keep documentation-only changes separate from implementation changes when practical.
- Do not revert user changes.
- Do not hand-edit generated files once generation exists.
- Keep changes scoped to the current request.
- Never start `npm run dev` or any local server on your own. If a server is needed, use an existing one or ask the user to launch it.

## Coding Conventions
- All function definitions must use `const` arrow functions. Pure `function` declarations are not allowed.
- TypeScript strict mode is enabled. No `any` without explicit justification. All env vars are Zod-validated.
- Page components may use default exports; everything else should use named exports.

## Styling
- Tailwind CSS v4 with CSS variables for theming.
- Use semantic color tokens such as `bg-background`, `text-foreground`, and `text-primary`.
- Dark mode support uses `next-themes` with the `dark` class strategy.

## Accessibility
- Every interactive control needs an accessible name.
- Use semantic HTML such as `<nav>`, `<main>`, `<section>`, `<button>`, and `<a>`.
- Icon-only buttons must have `aria-label`.
- Respect `prefers-reduced-motion`.
- Keyboard focus must be visible and intentional.

## Backend Boundary
- The Next.js app calls the Hono API via HTTP.
- No database access and no Server Actions that bypass the API.
- The API client is in `src/lib/api.ts` and uses Bearer auth.
- Backend is assumed to be running at `http://localhost:3004`.

## Localization
- Default locale is Finnish (`fi`) and all UI copy is in Finnish.
- Translation keys live in `messages/fi.json`.
- Tests should use translation keys via the `I18nProvider` test helper.
- Future languages can be added by creating new message files and updating `src/i18n/request.ts`.

## Environment Assumptions
- Dev server port: `4300`
- Backend port: `3004`
- Playwright E2E base URL: `http://localhost:4300`

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/api.ts` | Typed fetch client to Hono backend |
| `src/lib/env.ts` | Zod-validated environment variables |
| `src/lib/api-types.ts` | Auto-generated from backend OpenAPI |
| `src/i18n/request.ts` | `next-intl` request config |
| `src/app/sw.ts` | Serwist service worker |
| `messages/fi.json` | Finnish translation messages |
