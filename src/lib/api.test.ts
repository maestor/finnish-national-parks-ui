import { apiFetch } from "./api";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  getStoredApiKey: () => undefined,
}));

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts a readable message from JSON error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: "Liian monta kuvaa" }),
    } as Response);

    await expect(apiFetch("/api/test")).rejects.toThrow("API error 400: Liian monta kuvaa");
  });
});
