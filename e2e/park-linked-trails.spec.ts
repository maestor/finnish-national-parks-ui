import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 354, height: 708 },
  { width: 390, height: 844 },
]) {
  test(`linked trails keep one map and switch details at ${viewport.width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport,
      colorScheme: viewport.width === 354 ? "dark" : "light",
      reducedMotion: "reduce",
      hasTouch: viewport.width < 768,
    });
    try {
      const page = await context.newPage();
      await page.goto("/paikka/sipoonkorven-kansallispuisto");
      const location = page.locator("#park-location");
      await expect(location.getByText("Knutersintie 667, 04130 Sipoo")).toBeVisible();
      const map = location.locator(".maplibregl-map");
      await expect(map).toBeVisible();
      const initialHeight = await map.evaluate((el) => el.getBoundingClientRect().height);
      expect(initialHeight).toBe(viewport.width < 768 ? 348 : 428);
      if (viewport.width < 768) {
        const opener = location.getByRole("button", { name: /Reitit \(14\)/ });
        await opener.click();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(opener).toBeFocused();
        await opener.click();
      }
      const choices =
        viewport.width < 768 ? page.getByRole("dialog") : location.locator("fieldset");
      await choices.locator(".overflow-y-auto").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(choices.getByRole("button", { name: "Koko alue" })).toBeVisible();
      await choices.locator(".overflow-y-auto").evaluate((el) => {
        el.scrollTop = 0;
      });
      const trail = choices.locator("button[aria-pressed]").nth(1);
      const name = await trail.innerText();
      await trail.click();
      await expect(location.getByTestId("selection-details")).toContainText(name);
      await expect(location.getByTestId("selection-details")).not.toContainText("Knutersintie");
      expect(await map.evaluate((el) => el.getBoundingClientRect().height)).toBe(initialHeight);
      if (viewport.width < 768)
        await location.getByRole("button", { name: /Reitit \(14\)/ }).click();
      await choices.getByRole("button", { name: "Fiskträsk", exact: true }).click();
      await expect(location.getByTestId("selection-details")).toContainText("Fiskträsk");
      await expect(location.getByTestId("selection-details")).not.toContainText("km");
      expect(await map.evaluate((el) => el.getBoundingClientRect().height)).toBe(initialHeight);
      if (viewport.width < 768)
        await location.getByRole("button", { name: /Reitit \(14\)/ }).click();
      await choices.getByRole("button", { name: "Koko alue" }).click();
      await expect(location.getByText("Knutersintie 667, 04130 Sipoo")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBe(0);
      expect(await map.evaluate((el) => el.getBoundingClientRect().height)).toBe(initialHeight);
    } finally {
      await context.close();
    }
  });
}

test("map touch and overlapping lines select directly", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto("/paikka/sipoonkorven-kansallispuisto");
    const location = page.locator("#park-location");
    await location.scrollIntoViewIfNeeded();
    const map = location.locator(".maplibregl-map");
    await expect(map).toBeVisible();
    const box = await map.boundingBox();
    if (!box) throw new Error("Map has no bounds");
    const details = location.getByTestId("selection-details");
    await page.mouse.move(box.x + 349, box.y + 61);
    await expect(location.locator("span.pointer-events-none.absolute")).toHaveText(
      "Byabäckenin polku · 2,1 km",
    );
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + 349, y: box.y + 61, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: box.x + 389, y: box.y + 91, id: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(details).toContainText("Knutersintie");
    await location.locator("fieldset").getByRole("button", { name: "Koko alue" }).click();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: box.x + 349, y: box.y + 61, id: 1 },
        { x: box.x + 369, y: box.y + 61, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: box.x + 329, y: box.y + 61, id: 1 },
        { x: box.x + 389, y: box.y + 61, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(details).toContainText("Knutersintie");
    await location.locator("fieldset").getByRole("button", { name: "Koko alue" }).click();
    await page.touchscreen.tap(box.x + 349, box.y + 61);
    await expect(details).toContainText("Byabäckenin polku");
    await expect(location.getByRole("button", { name: "Valitse reitti" })).toHaveCount(0);
    await location.locator("fieldset").getByRole("button", { name: "Koko alue" }).click();
    await page.waitForTimeout(800);
    await page.mouse.move(box.x + 354, box.y + 198);
    const label = location.locator("span.pointer-events-none.absolute");
    await expect(label).toBeVisible();
    const hoveredName = (await label.innerText()).split(" · ")[0];
    await page.mouse.click(box.x + 354, box.y + 198);
    await expect(details).toContainText(hoveredName);
    await expect(location.getByRole("button", { name: "Valitse reitti" })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("a park without linked trails keeps the original map and address", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
  });
  try {
    const page = await context.newPage();
    await page.goto("/paikka/aate-pekan-polku");
    const location = page.locator("#park-location");
    await expect(location.getByText("Oronmyllyntie 250, 59310 Särkisalmi")).toBeVisible();
    const map = location.locator(".maplibregl-map");
    await expect(map).toBeVisible();
    expect(await map.evaluate((el) => el.parentElement?.getBoundingClientRect().height)).toBe(320);
    await expect(location.getByRole("button", { name: /Reitit/ })).toHaveCount(0);
    await expect(location.getByTestId("selection-details")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("area materials return after choosing a linked trail", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto("/paikka/ahveniston-luonnonsuojelualue");
    const location = page.locator("#park-location");
    const details = location.getByTestId("selection-details");
    await expect(details.getByRole("link", { name: /Web-sivu/ })).toBeVisible();
    const trigger = location.getByRole("button", { name: /Reitit \(2\)/ });
    await trigger.click();
    await page.getByRole("dialog").locator("button[aria-pressed]").nth(1).click();
    await expect(details.getByRole("link", { name: /Web-sivu/ })).toHaveCount(0);
    await expect(details).not.toContainText("Olympiakatu 20");
    await trigger.click();
    await page.getByRole("dialog").getByRole("button", { name: "Koko alue" }).click();
    await expect(details.getByRole("link", { name: /Web-sivu/ })).toBeVisible();
    await expect(details).toContainText("Olympiakatu 20");
  } finally {
    await context.close();
  }
});

for (const width of [350, 1280]) {
  test(`keeps materials and map controls clear at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: 850 },
      colorScheme: width === 350 ? "dark" : "light",
      reducedMotion: "reduce",
    });
    try {
      const page = await context.newPage();
      await page.goto("/paikka/auttikongas");
      const location = page.locator("#park-location");
      await location.scrollIntoViewIfNeeded();
      const panel = location.getByTestId("selection-details");
      const links = panel.getByRole("link");
      await expect(links).toHaveCount(2);
      const first = await links.nth(0).boundingBox();
      const second = await links.nth(1).boundingBox();
      const panelBox = await panel.boundingBox();
      const label = await panel.getByText("Koko alue").boundingBox();
      if (!first || !second || !panelBox || !label) throw new Error("Missing panel geometry");
      expect(first.y).toBe(second.y);
      expect(first.height).toBeGreaterThanOrEqual(44);
      expect(second.height).toBeGreaterThanOrEqual(44);
      expect(second.x + second.width).toBeLessThanOrEqual(panelBox.x + panelBox.width);
      if (width >= 768) {
        expect(label.y - panelBox.y).toBeLessThan(20);
        expect(
          Math.abs(first.y + first.height / 2 - (panelBox.y + panelBox.height / 2)),
        ).toBeLessThan(2);
      }
      const map = location.locator(".maplibregl-map");
      await expect(map).toBeVisible();
      const attribution = await map.locator(".maplibregl-ctrl-attrib").boundingBox();
      const reset = await map
        .locator("..")
        .getByRole("button", { name: "Koko alue" })
        .boundingBox();
      if (!attribution || !reset) throw new Error("Missing map controls");
      const intersects =
        reset.x < attribution.x + attribution.width &&
        reset.x + reset.width > attribution.x &&
        reset.y < attribution.y + attribution.height &&
        reset.y + reset.height > attribution.y;
      expect(intersects).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    } finally {
      await context.close();
    }
  });
}
