# Agent Instructions

## Start of Session — Mandatory Gate

Before investigating, planning, editing, or running code:

1. Read `README.md`, `docs/DEVELOPMENT.md`, and `docs/TESTING.md` fully.
2. Read every relevant project skill before acting:
   - UI, accessibility, semantic HTML, focus, or interaction: `.agents/skills/accessibility-first-ui/SKILL.md`
   - API, OpenAPI, generated types, or UI/API contract: `.agents/skills/api-contract-sync/SKILL.md`
   - Browser, responsive, or visual verification: `.agents/skills/browser-ui-verification/SKILL.md`
   - Tests or TDD: `.agents/skills/intelligence-testing/SKILL.md`
   - Local verification strategy: `.agents/skills/local-first-verification/SKILL.md`
   - Documentation or planning: `.agents/skills/project-documentation/SKILL.md`
   - Branch, commit, push, or PR work: `.agents/skills/git-pr-workflow/SKILL.md`
3. For a file or Git change, check the branch and work only on an explicit target branch or a new branch using `feature/`, `bugfix/`, `chore/`, `docs/`, `refactor/`, or `test/`.

`docs/DEVELOPMENT.md` and `docs/TESTING.md` are the source of truth for detailed architecture, UI, security, test, and verification conventions. Do not duplicate them here.

## Shared Plans Vault

- Use `/Users/maestor/Projects/Documentations/Reissuvihko/Plans/` for every new product, technical, research, and cross-repository plan; start from `_Plan template.md`.
- Put UI-only plans in `Plans/UI/`, API-only plans in `Plans/API/`, and cross-repository or non-repository plans directly in `Plans/`.
- Never create `docs/plans/` in this repository. Move any misplaced plan to the vault before continuing.

## Repository Rules

- All user-facing copy is Finnish and belongs in `messages/fi.json`.
- Use arrow functions; TypeScript is strict; do not use `any` without explicit justification. Use boolean-safe `&&` for render-or-nothing JSX.
- Keep the API boundary intact: use HTTP through `src/lib/api.ts`; do not access the database or use Server Actions to bypass the Hono API. Do not hand-edit `src/lib/api-types.ts`.
- For UI, styling, accessibility, security, cache, and media decisions, follow `docs/DEVELOPMENT.md` and the matched skill. Keep secrets server-only and mutation boundaries authenticated.
- Delete stale code in the touched area and update the relevant tracked documentation whenever a contributor-facing behavior changes.
- Do not start a local server unless the user asks or one is already running.

## Cross-Repository Work

- Read the API repository's `AGENTS.md` and relevant development/testing guides before changing shared behavior.
- The API owns Zod/OpenAPI schemas, persistence, authentication, and runtime behavior; this repository owns UI, translations, browser behavior, proxy routes, and generated consumers.
- Change the API contract first, regenerate `src/lib/api-types.ts`, update consumers and fixtures, then verify both repositories. Use matching branch suffixes, separate PRs, and document merge order.

## Delivery

- Do not work directly on `main`, revert user changes, or hand-edit generated files.
- Use focused checks while implementing. Pause for review before the final gate; after acceptance, run `npm run verify` unless the change is documentation/repository configuration only, then note that exception in the PR.
- After acceptance and verification, commit with the Git workflow, push, and provide a PR link and notes.
