import { expect, test } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`shared park visit links show the selected older visit (${reducedMotion})`, async ({
    browser,
    page,
  }) => {
    const sharedUrl =
      "http://localhost:4300/paikka/sipoonkorven-kansallispuisto?visit=21#visit-history";
    const context = await browser.newContext({ viewport: page.viewportSize(), reducedMotion });
    try {
      const recipient = await context.newPage();
      await recipient.route("**/_next/static/**/*.js", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 250));
        await route.continue();
      });
      await recipient.goto(sharedUrl);
      const history = recipient.locator("#visit-history");
      test.skip((await history.count()) === 0, "Requires Sipoonkorpi in the local dataset");
      const selectedVisit = history.locator('[class*="ring-primary/35"]');
      test.skip((await selectedVisit.count()) === 0, "Requires published visit 21 at Sipoonkorpi");
      const assertSelectedVisit = async () => {
        await expect(recipient.locator('nav a[href="#visit-history"]')).toHaveAttribute(
          "aria-current",
          "location",
        );
        await expect(recipient.locator("header")).toHaveClass(/translate-y-0/);
        await expect
          .poll(() =>
            selectedVisit.evaluate((card) => {
              const navBottom =
                document.querySelector('nav:has(a[href^="#"])')?.getBoundingClientRect().bottom ??
                0;
              const top = card.getBoundingClientRect().top;
              const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
              return Math.abs(top - Math.max(navBottom, window.scrollY + top - maxScroll));
            }),
          )
          .toBeLessThanOrEqual(2);
        await expect(selectedVisit.getByRole("button", { expanded: true })).toBeVisible();
        expect(recipient.url()).toBe(sharedUrl);
      };
      await assertSelectedVisit();
      await recipient.reload();
      await assertSelectedVisit();

      await recipient.locator('nav a[href="#visit-history"]').click();
      await expect
        .poll(() =>
          history.evaluate((section) => {
            const navBottom =
              document.querySelector('nav:has(a[href^="#"])')?.getBoundingClientRect().bottom ?? 0;
            return Math.abs(section.getBoundingClientRect().top - navBottom);
          }),
        )
        .toBeLessThanOrEqual(2);
      await expect(recipient.locator('nav a[href="#visit-history"]')).toHaveAttribute(
        "aria-current",
        "location",
      );
    } finally {
      await context.close();
    }
  });
}
