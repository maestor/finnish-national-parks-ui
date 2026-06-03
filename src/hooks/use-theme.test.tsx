import { renderHook } from "@testing-library/react";
import { useTheme as useNextTheme } from "next-themes";
import { describe, expect, it, vi } from "vitest";
import { useTheme } from "./use-theme";

vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}));

describe("useTheme", () => {
  it("returns the underlying next-themes hook result", () => {
    const themeState = {
      theme: "system",
      resolvedTheme: "dark",
      setTheme: vi.fn(),
      themes: ["light", "dark", "system"],
    };

    vi.mocked(useNextTheme).mockReturnValue(themeState);

    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe(themeState);
  });
});
