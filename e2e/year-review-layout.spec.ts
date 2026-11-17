import { expect, type Locator, test } from "@playwright/test";

const expectAlignedMetrics = async (story: Locator) => {
  const groups = await story.evaluate((root) => {
    const byParent = new Map<Element, { tileTop: number; valueBottom: number }[]>();
    for (const tile of root.querySelectorAll("div")) {
      const [label, value] = tile.children;
      if (
        tile.children.length !== 2 ||
        label.tagName !== "P" ||
        value.tagName !== "P" ||
        !/^\d+$/.test(value.textContent ?? "")
      )
        continue;
      const parent = tile.parentElement;
      if (!parent) throw new Error("Expected the metric grid");
      const siblings = byParent.get(parent) ?? [];
      siblings.push({
        tileTop: tile.getBoundingClientRect().top,
        valueBottom: value.getBoundingClientRect().bottom,
      });
      byParent.set(parent, siblings);
    }
    return [...byParent.values()];
  });
  expect(groups.length).toBeGreaterThan(1);
  for (const group of groups) {
    for (const metric of group) {
      const row = group.filter((other) => Math.abs(other.tileTop - metric.tileTop) < 2);
      const values = row.map((other) => other.valueBottom);
      expect(Math.max(...values) - Math.min(...values), "metric value alignment").toBeLessThan(2);
    }
  }
};

// Uses the local 2026 review dataset and the loopback-only development login.
for (const [width, colorScheme] of [
  [1440, "dark"],
  [1024, "light"],
  [354, "dark"],
] as const) {
  test(`year review keeps visit slots and magnet rows aligned at ${width}px`, async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      viewport: { width, height: width === 354 ? 708 : 1000 },
      colorScheme,
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.goto("/auth/dev-login");
      await page.goto("/hallinta/vuosikatsaus?year=2026");
      const story = page.locator('[data-testid="year-review-story"]:visible');
      await expect(story).toBeVisible();
      const intro = story.locator('[data-card-index="0"]');
      const tripLabel = intro.getByText("Retkiä yhteensä", { exact: true });
      const tripTotal = await tripLabel.locator("..").locator("p").last().innerText();
      expect(tripTotal).toMatch(/^\d+$/);
      await expect(intro.getByText("Paikat yhteensä", { exact: true })).toHaveCount(0);
      const summary = story.locator("[data-card-index]").last();
      const summaryTrip = summary.getByText("Retkiä yhteensä", { exact: true });
      const summaryTiles = summaryTrip.locator("../..");
      expect(await summaryTiles.locator("div > p:first-child").allTextContents()).toEqual([
        "Retkiä yhteensä",
        "Käynnit yhteensä",
        "Uudet paikat",
        "Kuvaa",
        "Aktiivista kuukautta",
      ]);
      expect(await summaryTrip.locator("..").locator("p").last().innerText()).toBe(tripTotal);
      const statPositions = await summaryTiles.evaluate((grid) =>
        [...grid.children].map((tile) => ({
          rowTop: tile.getBoundingClientRect().top,
          valueTop: tile.lastElementChild?.getBoundingClientRect().top,
        })),
      );
      for (const stat of statPositions) {
        const values = statPositions
          .filter((other) => Math.abs(other.rowTop - stat.rowTop) < 2)
          .map((other) => other.valueTop);
        expect(values.every((value) => value !== undefined)).toBe(true);
        const positions = values.filter((value) => value !== undefined);
        expect(
          Math.max(...positions) - Math.min(...positions),
          "summary value alignment",
        ).toBeLessThan(2);
      }

      await expectAlignedMetrics(story);

      const milestones = story
        .locator("[data-card-index]")
        .filter({ hasText: /Vuoden ensimmäinen|Vuoden viimeinen/ });
      expect(await milestones.count()).toBe(2);
      for (const milestone of await milestones.all()) {
        const tiles = milestone.getByText("Kuvaa", { exact: true }).locator("../..");
        const bounds = await tiles.evaluate((grid) =>
          [...grid.children].map((tile) => {
            const { width, top, bottom } = tile.getBoundingClientRect();
            return { width, top, bottom };
          }),
        );
        expect(bounds.length).toBeGreaterThan(1);
        expect(
          Math.max(...bounds.map((tile) => tile.width)) -
            Math.min(...bounds.map((tile) => tile.width)),
        ).toBeLessThan(2);
        for (let index = 1; index < bounds.length; index += 1) {
          expect(bounds[index].top).toBeGreaterThan(bounds[index - 1].bottom);
        }
      }
      const cards = story.getByRole("article");
      expect(await cards.count()).toBeGreaterThan(2);
      const rows = await cards.evaluateAll((elements) =>
        elements.map((card) => {
          const media = card.firstElementChild;
          const content = card.lastElementChild;
          if (!(media && content)) throw new Error("Expected a media slot and card content");
          const [title, date, trails] = content.children;
          return {
            top: card.getBoundingClientRect().top,
            mediaHeight: media.getBoundingClientRect().height,
            titleTop: title.getBoundingClientRect().top,
            dateTop: date.getBoundingClientRect().top,
            trailsTop: trails?.getBoundingClientRect().top,
          };
        }),
      );
      for (const item of rows) {
        const row = rows.filter((other) => Math.abs(other.top - item.top) < 2);
        for (const key of ["mediaHeight", "titleTop", "dateTop", "trailsTop"] as const) {
          const values = row.flatMap((card) => (card[key] === undefined ? [] : [card[key]]));
          if (values.length > 1) {
            expect(Math.max(...values) - Math.min(...values), key).toBeLessThan(2);
          }
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      const sectionCount = await story.locator("[data-card-index]").count();
      const lastMilestoneIndex = Number(await milestones.last().getAttribute("data-card-index"));
      await story
        .getByRole("button", {
          name: `Siirry korttiin ${lastMilestoneIndex + 1}/${sectionCount}`,
          exact: true,
        })
        .click();
      await expect(milestones.last()).not.toHaveAttribute("data-story-entry-state", "upcoming");
      const milestoneImage = milestones.last().getByRole("img");
      await milestoneImage.scrollIntoViewIfNeeded();
      await expect
        .poll(() => milestoneImage.evaluate((image) => (image as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      await milestones.last().screenshot({ path: testInfo.outputPath("milestone.png") });
      const magnetSection = cards.first().locator("xpath=ancestor::section[1]");
      const magnetIndex = Number(await magnetSection.getAttribute("data-card-index"));
      await story
        .getByRole("button", {
          name: `Siirry korttiin ${magnetIndex + 1}/${sectionCount}`,
          exact: true,
        })
        .click();
      await expect(magnetSection).not.toHaveAttribute("data-story-entry-state", "upcoming");
      await expect(cards.first().getByRole("img")).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("magnet-grid.png") });
    } finally {
      await context.close();
    }
  });
  test(`date-range review aligns metric values at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: width === 354 ? 708 : 1000 },
      colorScheme,
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.goto("/auth/dev-login");
      await page.goto(
        "/hallinta/ajanjaksokatsaus?name=Asettelu&startDate=2026-07-01&endDate=2026-10-31",
      );
      const story = page.locator('[data-testid="date-range-review-story"]:visible');
      await expect(story).toBeVisible();
      await expectAlignedMetrics(story);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    } finally {
      await context.close();
    }
  });
}
