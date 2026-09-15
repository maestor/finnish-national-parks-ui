import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifySessionToken } from "./session-auth";

const { jwtVerifyMock } = vi.hoisted(() => ({
  jwtVerifyMock: vi.fn(),
}));

vi.mock("jose", () => ({
  jwtVerify: jwtVerifyMock,
}));

const validPayload = {
  email: "admin@example.com",
  exp: 1_900_000_000,
  name: "Admin",
  picture: "https://example.com/admin.jpg",
  role: "admin",
  sub: "admin-1",
};

describe("verifySessionToken", () => {
  beforeEach(() => {
    jwtVerifyMock.mockReset();
    process.env.AUTH_JWT_SECRET = "test-jwt-secret";
  });

  it.each([
    ["missing expiry", { ...validPayload, exp: undefined }],
    ["non-finite expiry", { ...validPayload, exp: Number.NaN }],
    ["missing subject", { ...validPayload, sub: undefined }],
    ["empty subject", { ...validPayload, sub: "" }],
    ["malformed email", { ...validPayload, email: "not-an-email" }],
    ["invalid identity field types", { ...validPayload, name: 42 }],
    ["wrong role", { ...validPayload, role: "user" }],
  ])("rejects a session with %s", async (_label, payload) => {
    jwtVerifyMock.mockResolvedValueOnce({ payload });

    await expect(verifySessionToken("signed-session")).resolves.toBeNull();
  });

  it("accepts the complete API session contract", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: validPayload });

    await expect(verifySessionToken("signed-session")).resolves.toEqual(validPayload);
  });
});
