import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxyBackendRequest } from "./backend-proxy";

describe("proxyBackendRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards the request to the backend with cookies and the server-side API key", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const request = new Request("https://frontend.example/api/visits/123", {
      method: "PATCH",
      headers: {
        cookie: "__session=test-session",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ note: "Paivitetty" }),
    });

    const response = await proxyBackendRequest(request, "/api/visits/123");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      new URL("http://localhost:3004/api/visits/123"),
      expect.objectContaining({
        method: "PATCH",
        redirect: "manual",
        headers: expect.any(Headers),
        body: expect.any(ArrayBuffer),
      }),
    );

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    const headers = options?.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer test-api-key");
    expect(headers.get("cookie")).toBe("__session=test-session");

    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rewrites backend redirects to the frontend origin and forwards set-cookie", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          Location: "http://localhost:3004/control-panel",
          "Set-Cookie": "__session=signed-token; Path=/; HttpOnly; Secure; SameSite=Lax",
        },
      }),
    );

    const request = new Request("https://frontend.example/auth/google/callback?code=abc");

    const response = await proxyBackendRequest(request, "/auth/google/callback");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://frontend.example/hallinta");
    expect(response.headers.get("set-cookie")).toContain("__session=signed-token");
  });

  it("strips backend encoding headers that would break browser decoding on the proxied response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ parks: [] }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
          "Transfer-Encoding": "chunked",
          "Content-Length": "123",
        },
      }),
    );

    const request = new Request("https://frontend.example/api/parks");

    const response = await proxyBackendRequest(request, "/api/parks");

    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("transfer-encoding")).toBeNull();
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("content-type")).toBe("application/json");
  });

  it("applies a timeout signal so a hung backend cannot pin the route handler", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));

    const request = new Request("https://frontend.example/api/parks");

    await proxyBackendRequest(request, "/api/parks");

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns 504 when the backend request times out", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new DOMException("The operation timed out", "TimeoutError"),
    );

    const request = new Request("https://frontend.example/api/parks");

    const response = await proxyBackendRequest(request, "/api/parks");

    expect(response.status).toBe(504);
  });
});
