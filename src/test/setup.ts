import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:3004",
    API_KEY: "test-api-key",
    NEXT_PUBLIC_MAP_STYLE_URL: undefined,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");

  const createT = (namespace?: string) => {
    const t = (key: string) => (namespace ? `${namespace}.${key}` : key);
    t.rich = (key: string) => (namespace ? `${namespace}.${key}` : key);
    t.raw = (key: string) => (namespace ? `${namespace}.${key}` : key);
    return t;
  };

  return {
    ...actual,
    useTranslations: createT,
  };
});
