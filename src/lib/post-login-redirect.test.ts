import { describe, expect, it } from "vitest";
import { normalizePostLoginRedirectPath } from "./post-login-redirect";

describe("post-login destinations", () => {
  it("normalizes Finnish public destinations while preserving query and fragment", () => {
    expect(normalizePostLoginRedirectPath("/park/pallas?tab=history#kuvat")).toBe(
      "/paikka/pallas?tab=history#kuvat",
    );
    expect(normalizePostLoginRedirectPath("/")).toBe("/");
  });

  it.each([
    null,
    "",
    "/".repeat(2049),
    "/login",
    "/kirjaudu?error=auth_failed",
    "/control-panel",
    "/control-panel/visits",
    "/hallinta",
    "/hallinta/kaynnit?filter=draft",
    "/auth",
    "/auth/login",
    "/paikka/../kirjaudu",
    "https://evil.example/phish",
    "//evil.example/phish",
    "/retket/..//evil.example/phish",
    "/\\evil.example/phish",
    "/paikka/pallas\n",
  ])("rejects external, login, admin, auth and malformed destinations %j", (path) =>
    expect(normalizePostLoginRedirectPath(path)).toBeNull(),
  );
});
