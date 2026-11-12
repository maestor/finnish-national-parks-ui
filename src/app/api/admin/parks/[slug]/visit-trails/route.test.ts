// @vitest-environment node
import { SignJWT } from "jose";
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("rejects anonymous trail-choice reads before contacting the API", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const response = await GET(
    new Request("http://localhost:4300/api/admin/parks/alue/visit-trails"),
    { params: Promise.resolve({ slug: "alue" }) },
  );
  expect(response.status).toBe(401);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(fetch).not.toHaveBeenCalled();
});

it("forwards authenticated park choices privately with an encoded park slug", async () => {
  const secret = "test-visit-trails-secret-at-least-32-characters";
  vi.stubEnv("AUTH_JWT_SECRET", secret);
  const token = await new SignJWT({
    role: "admin",
    email: "admin@example.test",
    name: "Admin",
    picture: "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("fixture")
    .setIssuer("reissuvihko-api")
    .setAudience("reissuvihko-ui")
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ trails: [] }));
  const response = await GET(
    new Request("http://localhost:4300/api/admin/parks/alue/visit-trails", {
      headers: { cookie: `__session=${token}` },
    }),
    { params: Promise.resolve({ slug: "alue/osa" }) },
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(fetch).toHaveBeenCalledWith(
    new URL("http://localhost:3004/api/admin/parks/alue%2Fosa/visit-trails"),
    expect.anything(),
  );
  expect(await response.json()).toEqual({ trails: [] });
});
