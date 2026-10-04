import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SerwistProvider } from "./serwist-provider";

vi.mock("@serwist/turbopack/react", () => ({
  SerwistProvider: ({ children }: { children: ReactNode }) => children,
}));

const workerUrl = new URL("/serwist/sw.js", window.location.href).href;
const scope = new URL("/", window.location.href).href;

const makeRegistration = (
  scriptURL: string,
  state: "active" | "waiting" | "installing" = "active",
) => ({
  active: null,
  waiting: null,
  installing: null,
  [state]: { scriptURL },
  scope,
  unregister: vi.fn().mockResolvedValue(true),
});

describe("SerwistProvider development cache recovery", () => {
  const cacheNames = new Set<string>();
  const getRegistrations = vi.fn();
  const deleteCache = vi.fn(async (name: string) => cacheNames.delete(name));

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    cacheNames.clear();
    for (const name of ["public-static-v2", `serwist-precache-v2-${scope}`, "unrelated-cache"]) {
      cacheNames.add(name);
    }
    getRegistrations.mockReset().mockResolvedValue([]);
    deleteCache.mockClear();
    vi.stubGlobal("navigator", { serviceWorker: { getRegistrations } });
    vi.stubGlobal("caches", {
      keys: async () => [...cacheNames],
      delete: deleteCache,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const openApp = (disable?: boolean) =>
    render(
      <SerwistProvider swUrl="/serwist/sw.js" disable={disable}>
        <h1>Reissuvihko</h1>
      </SerwistProvider>,
    );

  it.each(["active", "waiting", "installing"] as const)(
    "removes the app's leftover %s worker and stale assets while preserving other origin caches",
    async (state) => {
      const own = makeRegistration(workerUrl, state);
      const unrelated = makeRegistration(new URL("/other-worker.js", scope).href);
      getRegistrations.mockResolvedValue([own, unrelated]);

      openApp(true);

      await waitFor(() => expect([...cacheNames]).toEqual(["unrelated-cache"]));
      expect(own.unregister).toHaveBeenCalledOnce();
      expect(unrelated.unregister).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { name: "Reissuvihko" })).toBeVisible();
    },
  );

  it("preserves caches when there is no registration belonging to this app", async () => {
    const unrelated = makeRegistration(new URL("/other-worker.js", scope).href);
    getRegistrations.mockResolvedValue([unrelated]);

    openApp(true);

    await waitFor(() => expect(getRegistrations).toHaveBeenCalledOnce());
    expect(unrelated.unregister).not.toHaveBeenCalled();
    expect(deleteCache).not.toHaveBeenCalled();
    expect(cacheNames.size).toBe(3);
  });

  it("leaves production registrations and static caches intact", () => {
    vi.stubEnv("NODE_ENV", "production");

    openApp(true);

    expect(getRegistrations).not.toHaveBeenCalled();
    expect(cacheNames.size).toBe(3);
  });

  it("does not clean caches when worker registration is enabled", () => {
    openApp();

    expect(getRegistrations).not.toHaveBeenCalled();
    expect(cacheNames.size).toBe(3);
  });

  it("renders normally in browsers without service-worker support", () => {
    vi.stubGlobal("navigator", {});

    openApp(true);

    expect(getRegistrations).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Reissuvihko" })).toBeVisible();
  });

  it("keeps the page usable when browser storage access fails", async () => {
    getRegistrations.mockRejectedValue(new Error("Browser storage denied"));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    openApp(true);

    await waitFor(() => expect(log).toHaveBeenCalled());
    expect(screen.getByRole("heading", { name: "Reissuvihko" })).toBeVisible();
    expect(cacheNames.size).toBe(3);
  });
});
