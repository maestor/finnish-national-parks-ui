import { apiFetch } from "@/lib/api";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets json headers for json requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-length": "12" },
        status: 200,
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/test", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(options.headers);

    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer test-api-key");
  });

  it("does not force a content type for form data uploads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-length": "12" },
        status: 200,
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const body = new FormData();
    body.append("file", new Blob(["demo"], { type: "image/jpeg" }), "demo.jpg");

    await apiFetch("/api/test", {
      method: "POST",
      body,
    });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(options.headers);

    expect(headers.get("Content-Type")).toBeNull();
    expect(headers.get("Authorization")).toBe("Bearer test-api-key");
  });
});
