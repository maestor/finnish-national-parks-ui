import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const { revalidatePathMock, revalidateTagMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

describe("revalidate public cache route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revalidates public summary tags and the specific park page", async () => {
    const request = new Request("http://localhost:4300/api/revalidate-public-cache", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parkSlug: "pallas" }),
    });

    const response = await POST(request);

    expect(revalidateTagMock).toHaveBeenCalledWith("public-home-summary", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("public-map-summary", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("public-visits", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("admin-visible-parks", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("admin-removed-parks", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("public-park:pallas", "max");
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/parks", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/visits", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/control-panel/parks", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/park/pallas", "page");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      parkSlug: "pallas",
    });
  });

  it("still revalidates shared pages when the request body is missing or invalid", async () => {
    const request = new Request("http://localhost:4300/api/revalidate-public-cache", {
      method: "POST",
      body: "not-json",
    });

    const response = await POST(request);

    expect(revalidateTagMock).toHaveBeenCalledWith("public-home-summary", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("public-map-summary", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("public-visits", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("admin-visible-parks", "max");
    expect(revalidateTagMock).toHaveBeenCalledWith("admin-removed-parks", "max");
    expect(revalidateTagMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^public-park:/),
      "max",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/parks", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/visits", "page");
    expect(revalidatePathMock).toHaveBeenCalledWith("/control-panel/parks", "page");
    expect(revalidatePathMock).not.toHaveBeenCalledWith(expect.stringMatching(/^\/park\//), "page");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      parkSlug: null,
    });
  });
});
