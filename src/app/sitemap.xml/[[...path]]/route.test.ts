import { describe, expect, it, vi } from "vitest";
import { buildSitemap as sitemap } from "@/lib/sitemap";
import { GET } from "./route";

vi.mock("@/lib/sitemap", () => ({ buildSitemap: vi.fn() }));

describe("cached sitemap response", () => {
  it("serves valid XML with the canonical public URLs", async () => {
    vi.mocked(sitemap).mockResolvedValue([
      { url: "https://reissuvihko.example.com/" },
      { url: "https://reissuvihko.example.com/paikka/testipuisto" },
    ]);
    const response = await GET(new Request("http://localhost/sitemap.xml"), {
      params: Promise.resolve({}),
    });
    expect(response.headers.get("content-type")).toBe("application/xml; charset=utf-8");
    const document = new DOMParser().parseFromString(await response.text(), "application/xml");
    expect(document.querySelector("parsererror")).toBeNull();
    expect([...document.querySelectorAll("loc")].map((loc) => loc.textContent)).toEqual([
      "https://reissuvihko.example.com/",
      "https://reissuvihko.example.com/paikka/testipuisto",
    ]);
  });

  it("escapes URL characters required by XML", async () => {
    const url = "https://example.com/a?x=1&y=<\"'>";
    vi.mocked(sitemap).mockResolvedValue([{ url }]);
    const response = await GET(new Request("http://localhost/sitemap.xml"), {
      params: Promise.resolve({}),
    });
    const document = new DOMParser().parseFromString(await response.text(), "application/xml");
    expect(document.querySelector("parsererror")).toBeNull();
    expect(document.querySelector("loc")?.textContent).toBe(url);
  });

  it("rejects extra segments without requesting data", async () => {
    vi.mocked(sitemap).mockClear();
    const response = await GET(new Request("http://localhost/sitemap.xml/extra"), {
      params: Promise.resolve({ path: ["extra"] }),
    });
    expect(response.status).toBe(404);
    expect(sitemap).not.toHaveBeenCalled();
  });

  it("does not turn an upstream failure into a successful empty sitemap", async () => {
    vi.mocked(sitemap).mockRejectedValue(new Error("API unavailable"));
    await expect(
      GET(new Request("http://localhost/sitemap.xml"), { params: Promise.resolve({}) }),
    ).rejects.toThrow("API unavailable");
  });
});
