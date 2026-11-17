import { expect, test } from "@playwright/test";

for (const { viewport, colorScheme } of [
  { viewport: { width: 354, height: 708 }, colorScheme: "dark" },
  { viewport: { width: 390, height: 844 }, colorScheme: "light" },
  { viewport: { width: 354, height: 510 }, colorScheme: "light" },
] as const) {
  test(`mobile map popup fits and opens the latest visit at ${viewport.width}x${viewport.height}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport,
      colorScheme,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.goto("/paikat");
      await page.getByRole("button", { name: "Hae paikkaa" }).tap();
      await page.getByRole("searchbox", { name: "Hae paikkaa" }).fill("Pyhä-Häkin kansallispuisto");
      await page.getByRole("button", { name: /^Pyhä-Häkin kansallispuisto/ }).tap();

      const popup = page.locator(".maplibregl-popup-content");
      await expect(
        popup.getByRole("heading", { name: "Pyhä-Häkin kansallispuisto" }),
      ).toBeVisible();
      await expect(popup).toBeInViewport({ ratio: 1 });
      const parkPageLink = popup.getByRole("link", { name: "Avaa paikan sivu" });
      if (viewport.height < 708) {
        expect(await popup.evaluate((element) => element.scrollHeight)).toBeGreaterThan(
          await popup.evaluate((element) => element.clientHeight),
        );
        await parkPageLink.scrollIntoViewIfNeeded();
      }
      await expect(parkPageLink).toBeInViewport({ ratio: 1 });

      const latestVisit = popup.getByRole("link", { name: /^Viimeisin käynti/ });
      await expect(latestVisit).toHaveText(/^Viimeisin käynti · \d{1,2}\.\d{1,2}\.\d{4}$/);
      expect((await latestVisit.boundingBox())?.height).toBe(
        (await parkPageLink.boundingBox())?.height,
      );
      const date = (await latestVisit.innerText()).replace("Viimeisin käynti · ", "");
      await latestVisit.tap();
      await expect(page).toHaveURL(
        /\/paikka\/pyha-hakin-kansallispuisto\?visit=\d+#visit-history$/,
      );
      const visitId = new URL(page.url()).searchParams.get("visit");
      const visit = page.locator(`#visit-history #park-visit-${visitId}`).filter({
        has: page.getByRole("button", { expanded: true }),
      });
      await expect(visit).toBeInViewport();
      await expect(visit).toContainText(date);
    } finally {
      await context.close();
    }
  });
}
