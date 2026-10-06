import { expect, test } from "@playwright/test";

test("a direct-entry visitor can follow the mobile trip trail back to the archive", async ({
  page,
}) => {
  await page.goto("/trips");
  await expect(page).toHaveURL(/\/retket$/);
  const archiveTrail = page.getByRole("navigation", { name: "Murupolku" });
  await expect(archiveTrail.getByRole("link", { name: "Reissuvihko" })).toHaveAttribute(
    "href",
    "/",
  );
  const tripLink = page
    .getByRole("region", { name: "Retkien luettelo" })
    .locator("a:has(article)")
    .first();
  test.skip((await tripLink.count()) === 0, "Requires a published trip in the local dataset");
  const href = await tripLink.getAttribute("href");
  expect(href).toBeTruthy();
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(href as string);
  const trail = page.getByRole("navigation", { name: "Murupolku" });
  const title = await page.getByRole("heading", { level: 1 }).innerText();
  const hero = trail.locator("xpath=ancestor::section[1]");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(trail.locator('[aria-current="page"]')).toHaveText(title);
  await expect(trail.locator('[aria-current="page"]')).toBeVisible();
  await expect(trail.getByRole("listitem")).toHaveCount(3);
  await expect(trail).toMatchAriaSnapshot(`
    - navigation "Murupolku":
      - list:
        - listitem:
          - link "Reissuvihko"
        - listitem:
          - link "Retket"
        - listitem: ${title}
  `);
  expect(
    await trail
      .getByRole("link", { name: "Reissuvihko" })
      .evaluate((link) => link.closest("li")?.getBoundingClientRect().width),
  ).toBe(1);
  const home = trail.getByRole("link", { name: "Reissuvihko" });
  await home.focus();
  await expect(home).toBeFocused();
  expect(
    await home.evaluate((link) => link.closest("li")?.getBoundingClientRect().width),
  ).toBeGreaterThan(1);
  const parent = trail.getByRole("link", { name: "Retket" });
  await expect(parent).toBeVisible();
  await parent.focus();
  await expect(parent).toBeFocused();
  expect(await parent.evaluate((link) => getComputedStyle(link).boxShadow)).not.toBe("none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await parent.press("Enter");
  await expect(page).toHaveURL(/\/retket$/);
  await trail.getByRole("link", { name: "Reissuvihko" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(trail).toHaveCount(0);
});

test("the public map keeps its space and archive/planner trails start their heroes", async ({
  page,
}) => {
  await page.goto("/paikat");
  await expect(page.getByRole("navigation", { name: "Murupolku" })).toHaveCount(0);
  for (const path of ["/retket", "/kaynnit", "/reissusuunnittelu"]) {
    await page.goto(path);
    const trail = page.getByRole("navigation", { name: "Murupolku" });
    const hero = trail.locator("xpath=ancestor::section[1]");
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await trail.evaluate((element) => element.parentElement?.firstElementChild === element),
    ).toBe(true);
  }
});
