import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as getCallback } from "./google/callback/route";
import { GET as getGoogle } from "./google/route";
import { GET as getLogin } from "./login/route";

const ORIGIN = "https://frontend.example";
const RETURN_COOKIE =
  "__oauth_return=%2Fpaikka%2Fpallas%3Ftab%3Dhistory%23kuvat; Max-Age=600; Path=/; HttpOnly; SameSite=Lax";
const CLEARED_RETURN_COOKIE = "__oauth_return=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax";

const googleResponse = (returnCookie: string) => {
  const headers = new Headers({
    location: "https://accounts.google.com/oauth?state=test-state",
    "cache-control": "private, no-store",
  });
  headers.append(
    "set-cookie",
    "__oauth_state=test-state; Max-Age=600; Path=/; HttpOnly; SameSite=Lax",
  );
  headers.append("set-cookie", returnCookie);
  headers.append("set-cookie", "__oauth_invitation=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
  return new Response(null, { status: 302, headers });
};

describe("frontend login destination forwarding", () => {
  afterEach(() => vi.restoreAllMocks());

  it("forwards the public return path to API-owned OAuth and preserves its cookies and final redirect", async () => {
    const startUrl = new URL("/auth/login", ORIGIN);
    startUrl.searchParams.set("returnTo", "/park/pallas?tab=history#kuvat");
    const start = await getLogin(new Request(startUrl));
    const googleUrl = start.headers.get("location");
    if (!googleUrl) throw new Error("Expected a Google login start URL");
    const callbackHeaders = new Headers({
      location: `${ORIGIN}/paikka/pallas?tab=history#kuvat`,
      "cache-control": "private, no-store",
    });
    callbackHeaders.append(
      "set-cookie",
      "__session=signed-session; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    callbackHeaders.append("set-cookie", CLEARED_RETURN_COOKIE);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(googleResponse(RETURN_COOKIE))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: callbackHeaders }));

    const google = await getGoogle(new Request(googleUrl));
    const callback = await getCallback(
      new Request(`${ORIGIN}/auth/google/callback?code=abc&state=test-state`, {
        headers: {
          cookie:
            "__oauth_state=test-state; __oauth_return=%2Fpaikka%2Fpallas%3Ftab%3Dhistory%23kuvat",
        },
      }),
    );

    const backendUrl = fetchSpy.mock.calls[0]?.[0] as URL;
    expect(backendUrl.origin + backendUrl.pathname).toBe("http://localhost:3004/auth/google");
    expect(backendUrl.searchParams.get("returnTo")).toBe("/paikka/pallas?tab=history#kuvat");
    expect(google.headers.getSetCookie()).toContain(RETURN_COOKIE);
    expect(google.headers.getSetCookie()).toContain(
      "__oauth_invitation=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
    );
    expect(callback.headers.get("location")).toBe(`${ORIGIN}/paikka/pallas?tab=history#kuvat`);
    expect(callback.headers.getSetCookie()).toContain(
      "__session=signed-session; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
    expect(callback.headers.getSetCookie()).toContain(CLEARED_RETURN_COOKIE);
    expect(callback.headers.get("cache-control")).toBe("private, no-store");
  });

  it("omits returnTo for login-page logins and preserves the API's canonical control-panel destination", async () => {
    const start = await getLogin(new Request(`${ORIGIN}/auth/login`));
    expect(start.headers.get("location")).toBe(`${ORIGIN}/auth/google`);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(googleResponse(CLEARED_RETURN_COOKIE))
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: `${ORIGIN}/hallinta` } }),
      );

    const google = await getGoogle(new Request(`${ORIGIN}/auth/google`));
    const callback = await getCallback(new Request(`${ORIGIN}/auth/google/callback?code=abc`));

    expect(fetchSpy.mock.calls[0]?.[0]).toEqual(new URL("http://localhost:3004/auth/google"));
    expect(google.headers.getSetCookie()).toContain(CLEARED_RETURN_COOKIE);
    expect(callback.headers.get("location")).toBe(`${ORIGIN}/hallinta`);
  });

  it.each([
    "/kirjaudu?error=auth_failed",
    "/hallinta",
    "//evil.example/phish",
    "/\\evil.example/phish",
    "https://evil.example/phish",
    "/auth/logout",
    "/".repeat(2049),
  ])(
    "drops unsafe or non-public return destination %j before forwarding to the API",
    async (returnTo) => {
      const googleUrl = new URL("/auth/google", ORIGIN);
      googleUrl.searchParams.set("returnTo", returnTo);
      const loginUrl = new URL(googleUrl);
      loginUrl.pathname = "/auth/login";
      expect((await getLogin(new Request(loginUrl))).headers.get("location")).toBe(
        `${ORIGIN}/auth/google`,
      );
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(googleResponse(CLEARED_RETURN_COOKIE));

      await getGoogle(new Request(googleUrl));

      expect(fetchSpy.mock.calls[0]?.[0]).toEqual(new URL("http://localhost:3004/auth/google"));
    },
  );

  it("preserves invitation parameters and backend cookie deletion", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(googleResponse(CLEARED_RETURN_COOKIE));

    const response = await getGoogle(new Request(`${ORIGIN}/auth/google?invite=invitation-token`));

    expect(fetchSpy.mock.calls[0]?.[0]).toEqual(
      new URL("http://localhost:3004/auth/google?invite=invitation-token"),
    );
    expect(response.headers.getSetCookie()).toContain(CLEARED_RETURN_COOKIE);
  });

  it("preserves failed-login redirects without substituting a public return destination", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: `${ORIGIN}/login?error=access_denied`,
          "set-cookie": CLEARED_RETURN_COOKIE,
        },
      }),
    );

    const callback = await getCallback(
      new Request(`${ORIGIN}/auth/google/callback?error=access_denied`),
    );

    expect(callback.headers.get("location")).toBe(`${ORIGIN}/login?error=access_denied`);
    expect(callback.headers.getSetCookie()).toContain(CLEARED_RETURN_COOKIE);
  });
});
