import { describe, expect, it } from "vitest";
import { GET as getLegacyCatalog } from "./.well-known/ai-catalog.json/route";
import { GET as getCatalog } from "./.well-known/ard.json/route";
import { GET as getLlms } from "./llms.txt/route";

describe("agent discovery responses", () => {
  it("serves a Finnish Markdown summary with canonical public links", async () => {
    const response = getLlms();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(body).toMatch(/^# Reissuvihko\n/m);
    expect(body).toContain("Retkimuistoja Suomen luonto- ja historiakohteista");
    expect(body).toContain("[Etusivu](https://reissuvihko.example.com/)");
    expect(body).toContain("[Paikat](https://reissuvihko.example.com/paikat)");
    expect(body).toContain("[Käynnit](https://reissuvihko.example.com/kaynnit)");
    expect(body).toContain("[Retket](https://reissuvihko.example.com/retket)");
    expect(body).toContain("[Reitit](https://reissuvihko.example.com/reissusuunnittelu)");
    expect(body).toContain("[Sivukartta](https://reissuvihko.example.com/sitemap.xml)");
    expect(body).not.toContain("<!DOCTYPE");
    expect(body).not.toContain("/hallinta");
    expect(body).not.toContain("/kirjaudu");
  });

  it.each([
    ["ai-catalog.json", getLegacyCatalog],
    ["ard.json", getCatalog],
  ])("reports absent %s as HTTP 404 instead of successful HTML", async (_name, get) => {
    const response = get();

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});
