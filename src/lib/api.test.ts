import { apiFetch } from "./api";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  getStoredApiKey: () => undefined,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ cookie: "__session=test-session" })),
}));

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts a readable message from JSON error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: "Liian monta kuvaa" }),
    } as Response);

    await expect(apiFetch("/api/test")).rejects.toThrow("API error 400: Liian monta kuvaa");
  });

  it("forwards the incoming cookie header for server-side requests", async () => {
    const originalWindow = globalThis.window;
    try {
      // Simulate a server-side call path so apiFetch forwards request cookies.
      Object.defineProperty(globalThis, "window", {
        value: undefined,
        configurable: true,
        writable: true,
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ ok: true }),
      } as Response);

      await apiFetch("/api/test");

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://localhost:3004/api/test",
        expect.objectContaining({
          headers: expect.any(Headers),
        }),
      );

      const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
      const headers = options?.headers as Headers;
      expect(headers.get("cookie")).toBe("__session=test-session");
    } finally {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    }
  });
});
