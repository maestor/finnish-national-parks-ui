import { describe, expect, it, vi } from "vitest";

describe("backend-proxy module loading", () => {
  it("does not read NEXT_PUBLIC_API_URL during module import", async () => {
    vi.resetModules();

    let envReadCount = 0;

    vi.doMock("@/lib/env", () => ({
      env: new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === "NEXT_PUBLIC_API_URL") {
              envReadCount += 1;
              throw new Error("NEXT_PUBLIC_API_URL should not be read at import time");
            }

            return undefined;
          },
        },
      ),
    }));

    await expect(import("./backend-proxy")).resolves.toHaveProperty("proxyBackendRequest");
    expect(envReadCount).toBe(0);

    vi.doUnmock("@/lib/env");
    vi.resetModules();
  });
});
