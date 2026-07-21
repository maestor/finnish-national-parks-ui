import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxyBackendRequest } from "./backend-proxy";

const { jwtVerifyMock } = vi.hoisted(() => ({
  jwtVerifyMock: vi.fn(),
}));

vi.mock("jose", () => ({
  jwtVerify: jwtVerifyMock,
}));

describe("proxyBackendRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    jwtVerifyMock.mockReset();
    process.env.AUTH_COOKIE_NAME = "__session";
    process.env.AUTH_JWT_SECRET = "test-jwt-secret";
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

  it("forwards only allowlisted headers and never a client-supplied authorization header", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));

    const request = new Request("https://frontend.example/api/visits/123", {
      method: "PATCH",
      headers: {
        authorization: "Bearer forged-client-token",
        "content-type": "application/json",
        cookie: "__session=test-session",
        "x-forwarded-host": "evil.example",
        "x-custom-injection": "yes",
      },
      body: JSON.stringify({ note: "x" }),
    });

    await proxyBackendRequest(request, "/api/visits/123");

    const [, options] = vi.mocked(globalThis.fetch).mock.calls[0] ?? [];
    const headers = options?.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer test-api-key");
    expect(headers.get("cookie")).toBe("__session=test-session");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-forwarded-host")).toBeNull();
    expect(headers.get("x-custom-injection")).toBeNull();
  });

  it("rejects a non-GET request whose Origin host does not match the request host", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const request = new Request("https://frontend.example/api/visits/123", {
      method: "DELETE",
      headers: {
        origin: "https://evil.example",
      },
    });

    const response = await proxyBackendRequest(request, "/api/visits/123");

    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows a non-GET request with a matching Origin host", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));

    const request = new Request("https://frontend.example/api/visits/123", {
      method: "DELETE",
      headers: {
        origin: "https://frontend.example",
      },
    });

    const response = await proxyBackendRequest(request, "/api/visits/123");

    expect(response.status).toBe(204);
  });

  it("rejects admin-gated requests without a session token", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const request = new Request("https://frontend.example/api/visits/123", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: "x" }),
    });

    const response = await proxyBackendRequest(request, "/api/visits/123", {
      requireAdmin: true,
    });

    expect(response.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects admin-gated requests whose session is not an admin", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { role: "user" } });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const request = new Request("https://frontend.example/api/visits/123", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: "__session=test-session",
      },
      body: JSON.stringify({ note: "x" }),
    });

    const response = await proxyBackendRequest(request, "/api/visits/123", {
      requireAdmin: true,
    });

    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards admin-gated requests for a verified admin session", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { role: "admin" } });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));

    const request = new Request("https://frontend.example/api/visits/123", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: "__session=test-session",
      },
      body: JSON.stringify({ note: "x" }),
    });

    const response = await proxyBackendRequest(request, "/api/visits/123", {
      requireAdmin: true,
    });

    expect(response.status).toBe(204);
    expect(jwtVerifyMock).toHaveBeenCalledTimes(1);
    expect(jwtVerifyMock.mock.calls[0]?.[2]).toEqual({
      algorithms: ["HS256"],
      issuer: "reissuvihko-api",
      audience: "reissuvihko-ui",
    });
  });
});
