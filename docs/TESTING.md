# Testing Guide

This project follows **behavior-first TDD**: write the realistic usage story first, turn it into a failing test, implement the smallest change to pass, then refactor.

Read the `intelligence-testing` skill (`.agents/skills/intelligence-testing/`) for the full philosophy. This document applies it to this codebase.

---

## Testing Stack

| Layer | Tool | Command |
|-------|------|---------|
| Unit / Component | Vitest + jsdom + Testing Library | `npm run test` |
| E2E | Playwright | `npm run test:e2e` |
| Quality Gate | All of the above + typecheck + lint + build | `npm run verify` |

---

## Test Layers

### 1. Component / Behavior Tests (Vitest + jsdom)

**Use for:** UI rendering, interactions, loading states, empty states, error states, accessibility.

**Location:** `src/**/*.test.ts` or `src/**/*.test.tsx`

**Bias:** Start here for most UI changes. Test what the user sees, not internal methods.

Example patterns in this repo:

```tsx
// src/components/layout/header.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Header } from "./header";

describe("Header", () => {
  it("renders site title link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: "layout.siteTitle" })).toBeInTheDocument();
  });
});
```

**Key conventions:**
- Query by role, label, or text — not by CSS class or test-id
- Use translation keys (e.g., `"layout.siteTitle"`) because tests mock `next-intl`
- Mock external libraries at the module level (see `park-map.test.tsx` for `maplibre-gl` mock)
- Mock `env.ts` values in `src/test/setup.ts` if needed

### 2. E2E Tests (Playwright)

**Use for:** Cross-page flows, routing, auth redirects, responsive behavior, keyboard flows.

**Location:** `e2e/*.spec.ts`

**Bias:** Write E2E when the behavior spans multiple pages or requires a real browser.

Example:

```ts
// e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Suomen kansallispuistot/);
});
```

**Running E2E:**

```bash
# Quick check (Chromium only)
npm run test:e2e

# Full check (all browsers + mobile)
npm run test:e2e:all
```

Playwright automatically starts the dev server (`npm run dev`) if not already running.

### 3. Unit Tests (Vitest)

**Use for:** Pure logic, deterministic helpers, reducers, parsers, and utilities that are awkward to reach through component tests.

**Bias:** Keep these narrow and focused. One strong behavior test is better than five thin unit tests for the same flow.

Example:

```ts
// src/lib/cn.test.ts
import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges tailwind classes without conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
```

---

## TDD Workflow

For every feature or fix:

1. **Frame the usage story**
   - Who is the actor? (public visitor, authenticated admin, API consumer)
   - What do they do?
   - What should they observe?
   - What can realistically go wrong?

2. **Pick the first failing test**
   - UI change → component test with Testing Library
   - Cross-page flow → E2E test
   - Pure helper → unit test

3. **Go red** — make the test fail for the right reason

4. **Go green** — implement the smallest production change that passes

5. **Add realistic scenarios** — success, loading, empty, invalid input, failure

6. **Refactor** — only after behavior is protected by tests

---

## Project-Specific Test Setup

### Global Mocks (`src/test/setup.ts`)

Already configured:
- `next-intl` — returns translation keys as strings (`"namespace.key"`)
- `next/navigation` — mocked router
- `@/lib/env` — mocked environment variables for test environment

### I18n Test Helper (`src/test/i18n.tsx`)

Use when a component needs real translations:

```tsx
import { I18nProvider } from "@/test/i18n";

render(
  <I18nProvider>
    <MyComponent />
  </I18nProvider>
);
```

### Mocking External Libraries

For heavy third-party libraries (e.g., `maplibre-gl`), mock the entire module:

```ts
vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn(() => ({ on: vi.fn(), remove: vi.fn() })),
    Marker: vi.fn(() => ({ addTo: vi.fn() })),
    // ...
  },
}));
```

### Mocking Auth State

The `useAuth` hook fetches `/auth/me`. In component tests, mock `apiFetch` or the hook itself depending on what you're testing:

```ts
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false, user: null, logout: vi.fn() }),
}));
```

---

## Anti-Patterns to Avoid

- **Testing component methods** instead of user-visible behavior
- **Mock-heavy stacks** that prove nothing about real integration
- **Speculative branches** — don't add "just in case" fallbacks without a concrete scenario
- **Duplicating happy paths** in unit, component, and E2E suites
- **Defensive logic that can't be triggered** — delete it rather than test it
- **Starting with internal helper tests** when the behavior belongs at UI or route level

---

## Verification Checklist Before Handoff

```bash
npm run verify
```

This runs: typecheck → lint → test → build.

If any step fails, fix before review. If environment limits block verification (e.g., backend not running), report the specific gap clearly.
