import { beforeEach, describe, expect, it } from "vitest";
import { clearStoredApiKey, getStoredApiKey, setStoredApiKey } from "./auth";

describe("stored API key helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads, writes, and clears the API key from local storage", () => {
    expect(getStoredApiKey()).toBeNull();

    setStoredApiKey("secret-key");

    expect(getStoredApiKey()).toBe("secret-key");

    clearStoredApiKey();

    expect(getStoredApiKey()).toBeNull();
  });
});
