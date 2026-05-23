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

    expect(consumePostLoginRedirectPath()).toBe("/park/pallas?tab=history");
    expect(consumePostLoginRedirectPath()).toBeNull();
  });

  it("ignores login and control-panel paths", () => {
    storePostLoginRedirectPath("/login");
    storePostLoginRedirectPath("/control-panel");
    storePostLoginRedirectPath("/control-panel/visits");

    expect(consumePostLoginRedirectPath()).toBeNull();
  });

  it("captures the current path with search and hash", () => {
    window.history.replaceState({}, "", "/park/pallas?tab=history#kuvat");

    expect(getCurrentPathWithSearchAndHash()).toBe("/park/pallas?tab=history#kuvat");
  });
});
