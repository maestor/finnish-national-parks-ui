import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

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
