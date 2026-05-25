import "@testing-library/jest-dom/vitest";

import type { ReactNode } from "react";
import { vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:3004",
    NEXT_PUBLIC_SITE_URL: "https://reissuvihko.example.com",
    API_KEY: "test-api-key",
    NEXT_PUBLIC_MAP_STYLE_URL: undefined,
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
    VERCEL_URL: undefined,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => {
  const createT = (namespace?: string) => {
    const t = (key: string) => (namespace ? `${namespace}.${key}` : key);
    t.rich = (key: string) => (namespace ? `${namespace}.${key}` : key);
    t.raw = (key: string) => (namespace ? `${namespace}.${key}` : key);
    return t;
  };

  return {
    useTranslations: createT,
    NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
  };
});
