import { beforeEach, describe, expect, it } from "vitest";
import {
  consumePostLoginRedirectPath,
  getCurrentPathWithSearchAndHash,
  storePostLoginRedirectPath,
} from "./post-login-redirect";

describe("post-login redirect helpers", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("stores and consumes a public return path", () => {
    storePostLoginRedirectPath("/park/pallas?tab=history");

    expect(consumePostLoginRedirectPath()).toBe("/paikka/pallas?tab=history");
    expect(consumePostLoginRedirectPath()).toBeNull();
  });

  it("ignores login and control-panel paths", () => {
    storePostLoginRedirectPath("/login");
    storePostLoginRedirectPath("/kirjaudu");
    storePostLoginRedirectPath("/control-panel");
    storePostLoginRedirectPath("/control-panel/visits");
    storePostLoginRedirectPath("/hallinta");
    storePostLoginRedirectPath("/hallinta/kaynnit");

    expect(consumePostLoginRedirectPath()).toBeNull();
  });

  it("refuses to store absolute or protocol-relative URLs", () => {
    storePostLoginRedirectPath("https://evil.example.com/phish");
    storePostLoginRedirectPath("//evil.example.com/phish");

    expect(consumePostLoginRedirectPath()).toBeNull();
  });

  it("drops a tampered external URL from storage instead of redirecting to it", () => {
    window.sessionStorage.setItem("post-login-redirect-path", "https://evil.example.com/phish");

    expect(consumePostLoginRedirectPath()).toBeNull();
  });

  it("captures the current path with search and hash", () => {
    window.history.replaceState({}, "", "/park/pallas?tab=history#kuvat");

    expect(getCurrentPathWithSearchAndHash()).toBe("/paikka/pallas?tab=history#kuvat");
  });
});
