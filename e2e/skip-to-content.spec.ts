import { expect, test } from "@playwright/test";

for (const path of ["/", "/kirjaudu"]) {
  for (const colorScheme of ["light", "dark"] as const) {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 354, height: 708 },
    ]) {
      test(`keyboard users bypass the header on ${path} in ${colorScheme} at ${viewport.width}px`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme });
        await page.goto(path);
        const skipLink = page.getByRole("link", { name: "Siirry sisältöön", exact: true });
        const main = page.getByRole("main");

        await expect(skipLink).toHaveCount(1);
        await expect(skipLink).not.toBeInViewport();
        await page.keyboard.press("Tab");
        await expect(skipLink).toBeFocused();
        await expect(skipLink).toBeInViewport({ ratio: 1 });
        const box = await skipLink.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);

        await page.keyboard.press("Enter");
        await expect(main).toBeFocused();
        await page.keyboard.press("Tab");
        await expect
          .poll(() => main.evaluate((element) => element.contains(document.activeElement)))
          .toBe(true);
      });
    }
  }
}
