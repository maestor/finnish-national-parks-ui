import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { verify, proxy, tag, path } = vi.hoisted(() => ({
  verify: vi.fn(),
  proxy: vi.fn(),
  tag: vi.fn(),
  path: vi.fn(),
}));
vi.mock("@/lib/session-auth", () => ({
  readSessionToken: (cookie: string | null) => (cookie ? "token" : null),
  verifySessionToken: verify,
  isAdminSession: (payload: { role?: string } | null) => payload?.role === "admin",
}));
vi.mock("@/lib/backend-proxy", () => ({ proxyBackendRequest: proxy }));
vi.mock("next/cache", () => ({ revalidateTag: tag, revalidatePath: path }));

const request = (scope: string, origin = "http://localhost:4300", cookie = "__session=test") =>
  new Request("http://localhost:4300/api/admin/cache", {
    method: "POST",
    headers: { origin, cookie, "content-type": "application/json" },
    body: JSON.stringify({ scope }),
  });

describe("manual cache management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verify.mockResolvedValue({ role: "admin" });
  });

  it("requires a live super-admin identity and same-origin request", async () => {
    proxy.mockResolvedValueOnce(Response.json({ isSuperAdmin: false }));
    expect((await POST(request("parks"))).status).toBe(403);
    expect(tag).not.toHaveBeenCalled();
    expect((await POST(request("parks", "https://evil.example"))).status).toBe(403);
    expect((await POST(request("parks", "http://localhost:4300", ""))).status).toBe(401);
  });

  it("expires all park detail data and pages for a super admin", async () => {
    proxy.mockResolvedValueOnce(Response.json({ isSuperAdmin: true }));
    expect((await POST(request("parks"))).status).toBe(200);
    expect(tag).toHaveBeenCalledWith("public-park-details", { expire: 0 });
    expect(path).toHaveBeenCalledWith("/paikka/[slug]", "page");
    expect(tag).not.toHaveBeenCalledWith("public-trip-details", expect.anything());
  });

  it.each([
    ["home", "home-summary", "/"],
    ["map", "map-summary", "/paikat"],
    ["visits", "public-visits", "/kaynnit"],
    ["trips", "public-trip-details", "/retki/[slug]"],
    ["all", "public-park-details", "/paikka/[slug]"],
  ])("expires %s for a super admin", async (scope, expectedTag, expectedPath) => {
    proxy.mockResolvedValueOnce(Response.json({ isSuperAdmin: true }));
    expect((await POST(request(scope))).status).toBe(200);
    expect(tag).toHaveBeenCalledWith(expectedTag, { expire: 0 });
    expect(path).toHaveBeenCalledWith(expectedPath, "page");
  });

  it("fails closed when identity cannot be checked or the scope is invalid", async () => {
    proxy.mockRejectedValueOnce(new Error("offline"));
    expect((await POST(request("all"))).status).toBe(503);
    proxy.mockResolvedValueOnce(Response.json({ isSuperAdmin: true }));
    expect((await POST(request("unknown"))).status).toBe(400);
    expect(tag).not.toHaveBeenCalled();
  });

  it.each([401, 503])("fails closed on identity service status %i", async (status) => {
    proxy.mockResolvedValueOnce(new Response(null, { status }));
    expect((await POST(request("all"))).status).toBe(status);
    expect(tag).not.toHaveBeenCalled();
  });

  it("rejects malformed identity and request payloads", async () => {
    proxy.mockResolvedValueOnce(new Response("invalid"));
    expect((await POST(request("all"))).status).toBe(403);
    proxy.mockResolvedValueOnce(Response.json({ isSuperAdmin: true }));
    const invalid = new Request("http://localhost:4300/api/admin/cache", {
      method: "POST",
      headers: { origin: "http://localhost:4300", cookie: "__session=test" },
      body: "{",
    });
    expect((await POST(invalid)).status).toBe(400);
    expect(tag).not.toHaveBeenCalled();
  });
});
