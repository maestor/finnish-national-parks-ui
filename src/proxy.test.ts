import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

const { verifySessionTokenMock } = vi.hoisted(() => ({
  verifySessionTokenMock: vi.fn(),
}));

vi.mock("./lib/session-auth", () => ({
  getSessionCookieName: () => "__session",
  isAdminSession: (payload: { role?: string } | null) => payload?.role === "admin",
  verifySessionToken: verifySessionTokenMock,
}));

describe("admin route proxy", () => {
  beforeEach(() => {
    verifySessionTokenMock.mockReset();
  });

  it("redirects signed sessions without the admin role to login", async () => {
    verifySessionTokenMock.mockResolvedValueOnce({ role: "user" });

    const response = await proxy(
      new NextRequest("https://frontend.example/hallinta", {
        headers: { cookie: "__session=signed-session" },
      }),
    );

    expect(response.headers.get("location")).toBe("https://frontend.example/kirjaudu");
  });

  it("allows a verified admin session to continue", async () => {
    verifySessionTokenMock.mockResolvedValueOnce({ role: "admin" });

    const response = await proxy(
      new NextRequest("https://frontend.example/hallinta", {
        headers: { cookie: "__session=signed-session" },
      }),
    );

    expect(response.status).toBe(200);
  });
});
