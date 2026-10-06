import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("optional session route", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_COOKIE_NAME", "__session");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  const createRequest = (cookie: string) =>
    new Request("https://frontend.example/auth/session", { headers: { cookie } });

  it.each(["", "theme=dark", "__session=", "__session=%"])(
    "returns an uncached anonymous session without a backend request for cookie %j",
    async (cookie) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const response = await GET(createRequest(cookie));

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      await expect(response.json()).resolves.toEqual({ user: null });
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])("returns the verified user with isSuperAdmin=%s", async (isSuperAdmin) => {
    const user = {
      id: "admin-1",
      email: "admin@example.com",
      isSuperAdmin,
      name: "Admin",
      picture: "https://example.com/admin.jpg",
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(user));

    const response = await GET(createRequest("__session=signed-session"));

    expect(fetchSpy).toHaveBeenCalledWith(
      new URL("http://localhost:3004/auth/me"),
      expect.objectContaining({ method: "GET" }),
    );
    const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("cookie")).toBe("__session=signed-session");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ user });
  });

  it("uses the configured cookie name to discover a signed-in session", async () => {
    vi.stubEnv("AUTH_COOKIE_NAME", "custom-session");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ error: "Unauthorized" }, { status: 401 }));

    const response = await GET(createRequest("custom-session=expired-session"));

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: null });
  });

  it("returns a successful anonymous session when the backend rejects an expired or invalid cookie", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const response = await GET(createRequest("__session=expired-session"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ user: null });
  });

  it.each([403, 500, 503])("preserves backend errors with status %s", async (status) => {
    const error = { error: "Service failure" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(error, { status }));

    const response = await GET(createRequest("__session=signed-session"));

    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual(error);
  });

  it("preserves a backend timeout as a 504", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new DOMException("Timed out", "TimeoutError"),
    );

    const response = await GET(createRequest("__session=signed-session"));

    expect(response.status).toBe(504);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not turn a network failure into a successful anonymous session", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Network unavailable"));

    await expect(GET(createRequest("__session=signed-session"))).rejects.toThrow(
      "Network unavailable",
    );
  });
});
