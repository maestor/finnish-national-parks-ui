import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { jwtVerifyMock, revalidatePathMock, revalidateTagMock } = vi.hoisted(() => ({
  jwtVerifyMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock("jose", () => ({
  jwtVerify: jwtVerifyMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

describe("revalidate public cache route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_COOKIE_NAME = "__session";
    process.env.AUTH_JWT_SECRET = "test-jwt-secret";
  });

  it("rejects unauthenticated revalidation requests", async () => {
    const request = new Request("http://localhost:4300/api/revalidate-public-cache", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parkSlug: "pallas" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(jwtVerifyMock).not.toHaveBeenCalled();
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
      ok: false,
    });
  });

  it("rejects an authenticated session without the admin role", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { role: "user" } } as never);

    const request = new Request("http://localhost:4300/api/revalidate-public-cache", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: "__session=test-session",
      },
      body: JSON.stringify({ parkSlug: "pallas" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(revalidateTagMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("revalidates summary tags and the specific park page for an authenticated admin session", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { role: "admin" } } as never);

    const request = new Request("http://localhost:4300/api/revalidate-public-cache", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: "__session=test-session",
      },
      body: JSON.stringify({ parkSlug: "pallas" }),
    });

    const response = await POST(request);

    expect(jwtVerifyMock).toHaveBeenCalledTimes(1);
    expect(jwtVerifyMock.mock.calls[0]?.[0]).toBe("test-session");
    expect(Array.from(jwtVerifyMock.mock.calls[0]?.[1] ?? [])).toEqual(
      Array.from(new TextEncoder().encode("test-jwt-secret")),
    );
    expect(jwtVerifyMock.mock.calls[0]?.[2]).toEqual({
      algorithms: ["HS256"],
      issuer: "reissuvihko-api",
      audience: "reissuvihko-ui",
    });
    expect(revalidateTagMock).toHaveBeenCalledWith("home-summary", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("map-summary", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("public-visits", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("admin-park-visibility", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("public-park:pallas", "max");
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/paikat", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/kaynnit", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/hallinta/paikat", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/paikka/pallas", "page");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      parkSlug: "pallas",
    });
  });

  it("still revalidates shared pages when an authenticated request body is missing or invalid", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { role: "admin" } } as never);

    const request = new Request("http://localhost:4300/api/revalidate-public-cache", {
      method: "POST",
      headers: {
        cookie: "__session=test-session",
      },
      body: "not-json",
    });

    const response = await POST(request);

    expect(revalidateTagMock).toHaveBeenCalledWith("home-summary", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("map-summary", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("public-visits", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("admin-park-visibility", "max");
    expect(revalidateTagMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^public-park:/),
      "max",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/paikat", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/kaynnit", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/hallinta/paikat", "page");
    expect(revalidatePathMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/paikka\//),
      "page",
    );
    await expect(response.json()).resolves.toEqual({
      ok: true,
      parkSlug: null,
    });
  });
});
