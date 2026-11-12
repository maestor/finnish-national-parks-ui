import { expect, test } from "@playwright/test";

// Fixture only the new visit assignment. Park geometry and the actual map remain real.
for (const width of [1280, 354]) {
  test(`visit trail badges select the map at ${width}px`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: width < 768 ? "dark" : "light",
      reducedMotion: width < 768 ? "reduce" : "no-preference",
    });
    try {
      const page = await context.newPage();
      await page.route("**/auth/session", (route) =>
        route.fulfill({
          json: {
            user: { email: "fixture@example.test", name: "Fixture", role: "admin", sub: "fixture" },
          },
        }),
      );
      await page.route("**/api/admin/parks/sipoonkorven-kansallispuisto/visits", (route) =>
        route.fulfill({
          json: {
            visits: [
              {
                id: 999999,
                visitedOn: "2026-11-12",
                createdAt: "2026-11-12",
                updatedAt: "2026-11-12",
                route: "Alkuperäinen reitti",
                note: "Käynnin muistiinpanot",
                author: null,
                status: "draft",
                location: null,
                trip: null,
                tripStopOrder: null,
                images: [],
                excludeFromRoute: false,
                trails: [
                  { id: 1, slug: "byabackenin-polku", name: "Byabäckenin polku" },
                  { id: 2, slug: "osm-relation-16799804", name: "Bakunkärrin kierros" },
                  {
                    id: 3,
                    slug: "missing-geometry",
                    name: "Pitkä reitin nimi ilman karttageometriaa näyttää rivittymisen pienellä näytöllä",
                  },
                ],
              },
            ],
          },
        }),
      );
      await page.goto("/paikka/sipoonkorven-kansallispuisto");
      const visit = page.locator("#park-visit-999999");
      await expect(visit.getByRole("heading", { name: "Reitit", exact: true })).toBeVisible();
      await expect(visit.getByText("Alkuperäinen reitti")).toBeVisible();
      expect(await visit.locator("h3").first().innerText()).toBe("Reitit");
      await visit.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`visit-trails-${width}.png`) });
      const trail = visit.getByRole("button", { name: "Näytä Byabäckenin polku kartalla" });
      await trail.focus();
      await page.keyboard.press("Enter");
      const location = page.locator("#park-location");
      await expect(location).toBeFocused();
      await expect(location.getByTestId("selection-details")).toContainText("Byabäckenin polku");
      await expect(location.locator(".maplibregl-map")).toBeVisible();
      await expect
        .poll(async () => location.evaluate((el) => Math.abs(el.getBoundingClientRect().top - 112)))
        .toBeLessThan(6);
      await trail.click();
      await expect(location).toBeFocused();
      await expect(location.getByTestId("selection-details")).toContainText("Byabäckenin polku");
      await visit.getByRole("button", { name: "Näytä Bakunkärrin kierros kartalla" }).click();
      await expect(location.getByTestId("selection-details")).toContainText("Bakunkärrin kierros");
      await expect(location.locator(".maplibregl-map")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      await visit.getByRole("button", { name: "Piilota lisätiedot" }).click();
      await expect(visit.locator("#visit-details-999999")).toHaveAttribute("inert");
    } finally {
      await context.close();
    }
  });
}
