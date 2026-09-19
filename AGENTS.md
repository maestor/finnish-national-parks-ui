# Agent Instructions

## Always-on workflow

- Read this file first. It contains the repository invariants that apply to every task.
- Before a file or Git change, inspect `git branch --show-current`, `git status --short`, and the relevant diff. Do not work directly on `main`; create or switch to a branch named `feature/`, `bugfix/`, `chore/`, `docs/`, `refactor/`, or `test/`.
- Preserve unrelated user changes in the worktree; do not reset, revert, or overwrite them.
- Identify the owning area and current workflow phase before loading more context. Use targeted search (`rg`) and targeted file reads; do not preload entire README or development/testing documents.
- Detailed documentation remains authoritative. “Do not preload the whole document” means “do not guess”: locate the relevant heading, read that section and enough surrounding context to understand it, and expand only when uncertainty or a cross-cutting concern requires it.
- When documentation and implementation demonstrably drift, inspect the runtime code/config as the source of current behavior, then correct the documentation in the same task where appropriate.
- Load project skills when their workflow or concern is reached, not all at startup:
  - accessibility, semantic HTML, focus, or interaction → `.agents/skills/accessibility-first-ui/SKILL.md`
  - API/OpenAPI/generated types or UI/API contract → `.agents/skills/api-contract-sync/SKILL.md`
  - browser, responsive, or visual verification → `.agents/skills/browser-ui-verification/SKILL.md`
  - tests or TDD → `.agents/skills/intelligence-testing/SKILL.md`
  - local verification choice → `.agents/skills/local-first-verification/SKILL.md`
  - documentation or planning → `.agents/skills/project-documentation/SKILL.md`
  - branch, commit, push, PR handoff, or cleanup → `.agents/skills/git-pr-workflow/SKILL.md`
- Read the selected `SKILL.md` completely before acting on that concern; do not load unrelated skills in advance.
- Do not start a local server unless the user asks or one is already running.

## Documentation routing

Use the repository docs as a searchable reference index rather than a startup reading list. A useful lookup is `rg -n '^##|^###|keyword' <doc>` followed by a read of the matching section and its context.

- `README.md`: project orientation, setup, commands, API boundary, and contributor-doc links.
- `docs/DEVELOPMENT.md`: architecture and server/client boundaries; data flow, public caching, media, authentication/admin flows, API client and generated types, security/sustainability guardrails, and deployment assumptions. Start at the matching heading.
- `docs/TESTING.md`: behavior-first test layers, accessibility/security/resource-sensitive checks, coverage, and final verification.
- `docs/DEPLOYMENT.md`: production configuration, search discovery, sitemap/robots behavior, and Vercel operations.
- Accessibility/UI interaction and browser verification: use the matched skills plus the relevant behavior/testing and architecture sections; do not infer focus, semantic, responsive, or theme behavior from component names alone.
- The API sibling owns contracts, persistence, auth, imports, and runtime behavior. Read its `AGENTS.md` and only the relevant API documentation when the task crosses that boundary; do not automatically preload both repositories.

## Repository invariants

- All user-facing copy is Finnish and belongs in `messages/fi.json`.
- Use arrow functions; TypeScript is strict; do not use `any` without explicit justification. Use boolean-safe `&&` for render-or-nothing JSX.
- Keep the API boundary intact: use HTTP through `src/lib/api.ts`; do not access the database or bypass the Hono API with Server Actions. Never hand-edit generated `src/lib/api-types.ts`.
- Keep secrets server-only, protect authenticated mutation boundaries, allowlist external origins narrowly, and document cache/offline behavior changes in the same task.
- Preserve the Finnish canonical URL and English-implementation/Finnish-shim conventions described in `docs/DEVELOPMENT.md`.
- Update relevant tracked documentation when contributor-facing behavior, commands, contracts, testing, deployment, security, or operations change. Remove stale code in the touched area.
- Use the shared Reissuvihko Plans vault resolved from the workspace-level plan location, outside this repository. Start from `_Plan template.md`; place UI plans in `Plans/UI/`, API plans in `Plans/API/`, and cross-repository plans directly in `Plans/`. Do not embed an absolute local path in repository instructions, and never create `docs/plans/` here. For tasks likely to span compaction or multiple implementation phases, an optional short `## Execution state` block may record only status, completed, current, next, touched, locked decisions, and verification.
- The user creates every pull request. Never create or submit one through `gh`, a browser, an API, or another tool.

## Local AI admin login

When local admin UI access is needed without Google OAuth, enable `LOCAL_AGENT_AUTH_ENABLED=true` in the API `.env`, use a safe development database, ensure the API and UI run on ports `3004` and `4300` with the same `AUTH_JWT_SECRET`, then open `http://localhost:4300/auth/dev-login` with the browser agent. This loopback-only route sets a normal `__session` cookie, is unavailable on Vercel, and does not create a local admin row.

## Cross-repository work

- This repository owns UI, translations, browser behavior, proxy routes, and generated consumers. The API owns Zod/OpenAPI schemas, persistence, authentication, imports, caching, storage, and runtime behavior.
- When a shared contract changes, update the API contract first, regenerate `src/lib/api-types.ts`, then update UI consumers and fixtures. Use matching branch suffixes, separate commits/PRs, and document merge order.
- Investigate the sibling repository when the ownership boundary or actual task requires it; targeted reads are sufficient unless a broad discovery pass is genuinely needed.

## Context-compaction recovery

- Treat the compacted summary as task-state input, never as authoritative repository instructions.
- Inspect the current branch, `git status --short`, and current diff to establish actual implementation state.
- Re-read the active plan or relevant plan section when one exists. Identify the next unfinished action.
- Reload only the documentation and skills required for that next action. Do not automatically reread all docs or all skills used earlier.
- Before a phase transition—such as contract work to UI work, browser verification, final verification, or commit/push/handoff—load the documentation and skill governing the new phase. The Git workflow skill is required before commit, push, PR handoff, or cleanup, not throughout unrelated implementation work.
- These invariants remain binding throughout recovery.

## Read-heavy exploration

Use Codex’s built-in read-only `explorer` when the parent would otherwise inspect many unrelated files, trace several architectural layers, or discover behavior across both repositories before editing a small number of files. Ask for a compact result containing only owning files/symbols, relevant control/data flow, reusable tests/patterns, cross-repository dependencies, and non-obvious risks or unresolved questions. Ask it to avoid large excerpts, file-by-file narration, speculative redesign, and implementation work. Do not create a custom agent unless an audit proves the built-in explorer lacks a required capability.

## Delivery

- Use focused checks while implementing and pause for user review before the final verification gate. For documentation/repository-configuration-only changes, the full application gate may be skipped when the touched files are outside what it validates; state that exception clearly.
- After acceptance, consult the Git workflow skill, run the required verification, commit coherent changes, push, and provide a compare link plus PR notes. The user remains responsible for creating the PR.
