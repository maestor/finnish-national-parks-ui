import { apiAuthFetch, apiFetch, apiPublicFetch } from "./api";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ cookie: "__session=test-session" })),
}));

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts a readable message from string JSON error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify("Virhe"),
    } as Response);

    await expect(apiFetch("/api/test")).rejects.toThrow("API error 400: Virhe");
  });

  it("extracts a readable message from JSON error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: "Liian monta kuvaa" }),
    } as Response);

    await expect(apiFetch("/api/test")).rejects.toThrow("API error 400: Liian monta kuvaa");
  });

  it("extracts an error field from JSON error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => JSON.stringify({ error: "Yhteys poikki" }),
    } as Response);

    await expect(apiFetch("/api/test")).rejects.toThrow("API error 502: Yhteys poikki");
  });

  it("falls back to trimmed plain text error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "  Palvelin ei vastaa  ",
    } as Response);

    await expect(apiFetch("/api/test")).rejects.toThrow("API error 500: Palvelin ei vastaa");
  });

  it("uses a generic error when the response body is empty", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "   ",
    } as Response);

    await expect(apiFetch("/api/test")).rejects.toThrow("API error 500");
  });

  it("forwards the incoming cookie header for server-side requests when explicitly requested", async () => {
    const originalWindow = globalThis.window;
    try {
      // Simulate a server-side call path so apiFetch can forward request cookies.
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

      await apiFetch("/api/test", { includeServerCookies: true });

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

  it("omits forwarded cookies for public server-side requests but still sends the API key", async () => {
    const originalWindow = globalThis.window;
    try {
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

      await apiPublicFetch("/api/home-summary");

      const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
      const headers = options?.headers as Headers;
      expect(headers.get("authorization")).toBe("Bearer test-api-key");
      expect(headers.get("cookie")).toBeNull();
      expect(options?.credentials).toBeUndefined();
    } finally {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    }
  });

  it("uses same-origin paths for browser-side requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ ok: true }),
    } as Response);

    await apiFetch("/auth/me");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/auth/me",
      expect.objectContaining({
        credentials: "include",
        headers: expect.any(Headers),
      }),
    );

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    const headers = options?.headers as Headers;
    expect(headers.get("authorization")).toBeNull();
  });

  it("does not forward server cookies for browser-side auth requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ ok: true }),
    } as Response);

    await apiAuthFetch("/auth/me");

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    const headers = options?.headers as Headers;
    expect(headers.get("cookie")).toBeNull();
    expect(options?.credentials).toBe("include");
  });

  it("does not force a JSON content type for FormData bodies", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ ok: true }),
    } as Response);

    const formData = new FormData();
    formData.set("file", new Blob(["image"], { type: "image/png" }), "park.png");

    await apiFetch("/api/test", {
      method: "POST",
      body: formData,
    });

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    const headers = options?.headers as Headers;
    expect(headers.get("content-type")).toBeNull();
  });

  it("returns undefined for no-content responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers(),
      json: async () => ({ ok: true }),
    } as Response);

    await expect(apiFetch("/api/test")).resolves.toBeUndefined();
  });
});
