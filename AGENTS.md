# Agent Instructions

## Start of Session — MANDATORY GATE

**STOP. Do not write, read, search, or run any code until you have completed every step below in order.**

These steps are not suggestions. They are a hard gate. If you skip any step, you will produce broken, inconsistent, or off-convention work.

### Step 1 — Read project docs
Read these files fully before any action:
- `docs/DEVELOPMENT.md`
- `docs/TESTING.md`
- `README.md` (for human-oriented context)

Do not proceed until all three are read.

### Step 2 — Read relevant skills BEFORE acting
If the task touches any of the areas below, you **must** read the matching `SKILL.md` **before** you investigate, plan, or edit:

| Task area | Skill to read |
|-----------|---------------|
| UI components, accessibility, semantic HTML, focus handling | `.agents/skills/accessibility-first-ui/SKILL.md` |
| API changes, OpenAPI, generated types, backend/frontend contract | `.agents/skills/api-contract-sync/SKILL.md` |
| Browser screenshots, visual verification, dark/light mode check | `.agents/skills/browser-ui-verification/SKILL.md` |
| Tests, TDD, behavior-first development, mocking decisions | `.agents/skills/intelligence-testing/SKILL.md` |
| Local verification strategy, deciding what checks to run | `.agents/skills/local-first-verification/SKILL.md` |
| Documentation changes (`README.md`, `docs/**`, contributor guides) | `.agents/skills/project-documentation/SKILL.md` |
| Git branch, commit, push, PR workflow | `.agents/skills/git-pr-workflow/SKILL.md` |

**Do not treat skill reading as optional.** The skills exist so you do not re-invent the workflow every time. If a skill matches the work, read it.

### Step 3 — Activate Git workflow if files or Git state will change
If the request is likely to change files or Git state, **immediately after** Steps 1–2, activate `$git-pr-workflow`:
- Check the current branch.
- If on an existing feature branch, verify whether it has already been merged into `origin/main`. If yes — or if the task is genuinely new work — switch to `main`, pull latest, and create a **new** repo-valid working branch **before** any edits.
- Only continue on an existing branch if the user explicitly names it as the target.
- Use repo naming convention: `feature/<name>`, `bugfix/<name>`, `chore/<name>`, `docs/<name>`, `refactor/<name>`, or `test/<name>`.

### Step 4 — Only then proceed
After Steps 1–3 are complete, use this file for repo-specific conventions and overrides.

---

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

## Communication Language
- **All agent-to-user communication is in English.**
- Finnish words appear only when they are UI copy, translation keys, or direct quotes from the codebase.

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

## Cleanup and Documentation Hygiene
- **Never leave unused code behind.** Before finishing any task, remove dead code: orphaned imports, unused variables or parameters, unused translation keys, unreachable components, and stale comments. A passing `npm run verify` is not sufficient proof — grep for removed references explicitly.
- **Refactor clearly off-pattern code when you touch it.** If the requested change brings you into code that obviously conflicts with this repo's current conventions or quality bar, fix that nearby implementation as part of the same task instead of preserving it. Keep the cleanup scoped to the touched area and directly related behavior; do not use this rule to justify broad opportunistic rewrites.
- **Documentation must stay in sync.** Any change that affects behavior, architecture, environment variables, API usage, or feature status must update the relevant docs (`README.md`, `AGENTS.md`, `docs/**`, roadmaps, etc.) in the same PR. Do not treat docs as an afterthought.

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

## Testing Standards
- Prefer behavior-first tests that exercise what the user sees or does, not component internals.
- For UI interactions, prefer `@testing-library/user-event` over `fireEvent` unless you need a lower-level browser event.
- For Next.js App Router pages, prefer integration-style tests that render page modules through the real segment layout when practical.
- When route metadata is part of the user-visible contract, cover `generateMetadata` in tests alongside route rendering.
- Coverage exclusions should stay limited to non-product noise such as tool config, generated files, test helpers, and framework-only entrypoints. Do not exclude real runtime app code just to improve the report.

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
