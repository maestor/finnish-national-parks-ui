import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Reissuvihko/);
  await expect(page.getByRole("heading", { name: "Reissukooste", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Viimeisin retki", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Viimeisin piipahdus", level: 3 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kaikki retket", exact: true })).toHaveAttribute(
    "href",
    "/retket",
  );
  await expect(page.getByRole("link", { name: "Kaikki käynnit", exact: true })).toHaveAttribute(
    "href",
    "/kaynnit",
  );
  await page.getByRole("link", { name: /^Magneettijahti/ }).click();
  await expect(page).toHaveURL(/\/kaynnit\?view=parks$/);
  await expect(page.getByRole("link", { name: "Magneettijahti", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

for (const path of ["/", "/retket"]) {
  test(`memory cards respect reduced motion on ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    const card = page.locator("a:has(article)").first();
    test.skip((await card.count()) === 0, "Requires a published memory in the local dataset");
    await card.hover();
    await expect
      .poll(() =>
        card.locator("article").evaluate((element) => getComputedStyle(element).translate),
      )
      .toBe("0px");
    const image = card.locator("img");
    if (await image.count()) {
      await expect
        .poll(() => image.evaluate((element) => getComputedStyle(element).scale))
        .toBe("1");
    }
  });
}

test("signed-out control panel navigation redirects to the Finnish login page", async ({
  page,
}) => {
  await page.goto("/control-panel");
  await expect(page).toHaveURL(/\/kirjaudu$/);
  await expect(page.getByRole("heading", { name: "Kirjaudu", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kirjaudu hallintaan" })).toHaveAttribute(
    "href",
    "/auth/login",
  );
});

test("not found page works", async ({ page }) => {
  await page.goto("/non-existent-page");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});
