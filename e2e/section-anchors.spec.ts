import { expect, test } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  for (const detail of ["trip", "park"] as const) {
    test(`shared ${detail} section links scroll on direct entry and reload (${reducedMotion})`, async ({
      page,
      browser,
    }) => {
      await page.goto("/retket");
      const tripLink = page
        .getByRole("region", { name: "Retkien luettelo" })
        .locator("a:has(article)")
        .first();
      test.skip((await tripLink.count()) === 0, "Requires a published trip in the local dataset");
      const tripPath = await tripLink.getAttribute("href");
      expect(tripPath).toBeTruthy();
      await page.goto(tripPath as string);

      if (detail === "park") {
        const parkLink = page.locator('a[href^="/paikka/"]').first();
        test.skip((await parkLink.count()) === 0, "Requires a trip with a park visit");
        const parkPath = await parkLink.getAttribute("href");
        expect(parkPath).toBeTruthy();
        await page.goto(parkPath as string);
      }

      const sectionId = detail === "trip" ? "trip-description" : "park-about";
      test.skip(
        (await page.locator(`nav a[href="#${sectionId}"]`).count()) === 0,
        "Requires a detail page with a description/about section",
      );
      const sharedUrl = new URL(page.url());
      sharedUrl.hash = sectionId;
      const recipientContext = await browser.newContext({
        viewport: page.viewportSize(),
        reducedMotion,
      });
      try {
        const recipient = await recipientContext.newPage();
        // A recipient has no warmed client bundles. Delayed JS exposes the race
        // between the browser's fragment scroll and hydrated sticky-nav geometry.
        await recipient.route("**/_next/static/**/*.js", async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 250));
          await route.continue();
        });
        const assertAnchorPosition = async (targetId = sectionId) => {
          await expect.poll(() => recipient.evaluate(() => window.scrollY)).toBeGreaterThan(0);
          await expect(recipient.locator(`nav a[href="#${targetId}"]`)).toHaveAttribute(
            "aria-current",
            "location",
          );
          await expect
            .poll(() =>
              recipient.locator(`[id="${targetId}"]`).evaluate((section) => {
                const top = section.getBoundingClientRect().top;
                const navBottom =
                  document.querySelector('nav:has(a[href^="#"])')?.getBoundingClientRect().bottom ??
                  0;
                const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
                // Short final sections can only reach the bottom of the page.
                const expectedTop = Math.max(navBottom, window.scrollY + top - maxScroll);
                return Math.abs(top - expectedTop);
              }),
            )
            .toBeLessThanOrEqual(2);
          await expect
            .poll(() =>
              recipient
                .locator(`[id="${targetId}"]`)
                .evaluate(
                  (section) => section.getBoundingClientRect().top < window.innerHeight / 2,
                ),
            )
            .toBe(true);
          const expectedUrl = new URL(sharedUrl);
          expectedUrl.hash = targetId;
          expect(recipient.url()).toBe(expectedUrl.href);
        };

        const assertInitialHeader = async () => {
          await expect(recipient.locator("header")).toHaveClass(/translate-y-0/);
          await expect
            .poll(() =>
              recipient.locator("header").evaluate((header) => header.getBoundingClientRect().top),
            )
            .toBe(0);
        };

        await recipient.goto(sharedUrl.href);
        await assertAnchorPosition();
        await assertInitialHeader();
        await recipient.reload();
        await assertAnchorPosition();
        await assertInitialHeader();
        await recipient.mouse.move(10, 300);
        await recipient.mouse.wheel(0, 250);
        await expect(recipient.locator("header")).toHaveClass(/-translate-y-full/);

        const sectionLinks = recipient.locator('nav a[href^="#"]');
        // Return to the target from both directions, using the same visible alignment.
        // The trip route loads separately and can resize content below its heading.
        const followingLink = detail === "trip" ? sectionLinks.nth(1) : sectionLinks.last();
        const followingSectionId = (await followingLink.getAttribute("href"))?.slice(1);
        expect(followingSectionId).toBeTruthy();
        await followingLink.click();
        await assertAnchorPosition(followingSectionId);
        await recipient.locator(`nav a[href="#${sectionId}"]`).click();
        await assertAnchorPosition();
        await sectionLinks.first().click();
        const firstSectionId = (await sectionLinks.first().getAttribute("href"))?.slice(1);
        expect(firstSectionId).toBeTruthy();
        await assertAnchorPosition(firstSectionId);
        await recipient.locator(`nav a[href="#${sectionId}"]`).click();
        await assertAnchorPosition();
      } finally {
        await recipientContext.close();
      }
    });
  }
}
