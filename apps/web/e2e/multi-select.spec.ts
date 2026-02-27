import { test, expect, type Page, type Locator } from "@playwright/test";

const treeSelector = "[role='tree']";
const formSelector = "[data-form-container]";

function treeItem(page: Page, label: string) {
  return page.locator(`${treeSelector} [role='treeitem']`).filter({
    has: page.locator(`text="${label}"`),
  });
}

function formRow(page: Page, label: string) {
  return page.locator(`${formSelector} [data-form-node-id]`).filter({
    has: page.locator(`text="${label}"`),
  });
}

async function selectedTreeItems(page: Page) {
  return page
    .locator(`${treeSelector} [role='treeitem'][aria-selected='true']`)
    .all();
}

async function hasBgColor(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const bg = getComputedStyle(el).backgroundColor;
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data[3] > 0;
  });
}

async function bgColorsMatch(a: Locator, b: Locator): Promise<boolean> {
  const [bgA, bgB] = await Promise.all([
    a.evaluate((el) => {
      const bg = getComputedStyle(el).backgroundColor;
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    }),
    b.evaluate((el) => {
      const bg = getComputedStyle(el).backgroundColor;
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    }),
  ]);
  return bgA.every((v, i) => v === bgB[i]);
}

test.describe("multi-select: tree view", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(treeSelector);
  });

  test("plain click selects a single node", async ({ page }) => {
    await treeItem(page, "name").click();

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(1);
    await expect(
      page.locator(`${treeSelector} [role='treeitem'][aria-selected='true']`),
    ).toContainText("name");
  });

  test("plain click replaces previous selection", async ({ page }) => {
    await treeItem(page, "name").click();
    await treeItem(page, "version").click();

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(1);
    await expect(
      page.locator(`${treeSelector} [role='treeitem'][aria-selected='true']`),
    ).toContainText("version");
  });

  test("Cmd/Ctrl+click toggles additional nodes", async ({ page }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "name").click();
    await treeItem(page, "version").click({ modifiers: [mod] });

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(2);
  });

  test("Cmd/Ctrl+click deselects an already-selected node", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "name").click();
    await treeItem(page, "version").click({ modifiers: [mod] });
    await treeItem(page, "name").click({ modifiers: [mod] });

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(1);
    await expect(
      page.locator(`${treeSelector} [role='treeitem'][aria-selected='true']`),
    ).toContainText("version");
  });

  test("Cmd/Ctrl+click on the only selected node deselects all", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "name").click();
    expect(await selectedTreeItems(page)).toHaveLength(1);

    await treeItem(page, "name").click({ modifiers: [mod] });

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(0);
  });

  test("Shift+click selects a range", async ({ page }) => {
    await treeItem(page, "name").click();
    await treeItem(page, "private").click({ modifiers: ["Shift"] });

    const selected = await selectedTreeItems(page);
    expect(selected.length).toBeGreaterThanOrEqual(3);
  });

  test("Shift+ArrowDown extends selection", async ({ page }) => {
    await treeItem(page, "name").click();

    await page.locator(treeSelector).press("Shift+ArrowDown");

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(2);
  });

  test("Shift+ArrowUp extends selection", async ({ page }) => {
    await treeItem(page, "version").click();

    await page.locator(treeSelector).press("Shift+ArrowUp");

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(2);
  });

  test("ArrowDown without Shift resets to single selection", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";
    await treeItem(page, "name").click();
    await treeItem(page, "version").click({ modifiers: [mod] });
    expect(await selectedTreeItems(page)).toHaveLength(2);

    await page.locator(treeSelector).press("ArrowDown");

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(1);
  });

  test("Delete removes all selected nodes", async ({ page }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "name").click();
    await treeItem(page, "version").click({ modifiers: [mod] });
    expect(await selectedTreeItems(page)).toHaveLength(2);

    await page.locator(treeSelector).press("Delete");

    await expect(treeItem(page, "name")).toHaveCount(0);
    await expect(treeItem(page, "version")).toHaveCount(0);
  });

  test("right-click on selected node preserves multi-selection", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "name").click();
    await treeItem(page, "version").click({ modifiers: [mod] });
    expect(await selectedTreeItems(page)).toHaveLength(2);

    await treeItem(page, "version").click({ button: "right" });

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(2);
  });

  test("right-click on unselected node resets to single selection", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "name").click();
    await treeItem(page, "version").click({ modifiers: [mod] });
    expect(await selectedTreeItems(page)).toHaveLength(2);

    await treeItem(page, "private").click({ button: "right" });

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(1);
  });

  test("drag-and-drop moves all selected nodes", async ({ page }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    const allItems = page.locator(`${treeSelector} [role='treeitem']`);

    await treeItem(page, "name").click();
    await treeItem(page, "version").click({ modifiers: [mod] });
    expect(await selectedTreeItems(page)).toHaveLength(2);

    const source = treeItem(page, "name");
    const target = treeItem(page, "scripts");
    const targetBox = await target.boundingBox();
    await source.dragTo(target, {
      force: true,
      targetPosition: { x: targetBox!.width / 2, y: targetBox!.height - 2 },
    });

    const afterTexts = await allItems.allInnerTexts();
    const nameAfter = afterTexts.findIndex((t) => t.includes("name"));
    const versionAfter = afterTexts.findIndex((t) => t.includes("version"));
    const scriptsAfter = afterTexts.findIndex((t) => t.includes("scripts"));
    const privateAfter = afterTexts.findIndex((t) => t.includes("private"));

    expect(privateAfter).toBeLessThan(scriptsAfter);
    expect(scriptsAfter).toBeLessThan(nameAfter);
    expect(nameAfter).toBeLessThan(versionAfter);
  });
});

test.describe("multi-select: form view", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(formSelector);
  });

  test("Cmd/Ctrl+click selects multiple form rows", async ({ page }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await formRow(page, "name").click();
    await formRow(page, "version").click({ modifiers: [mod] });

    const nameRow = formRow(page, "name");
    const versionRow = formRow(page, "version");

    expect(await hasBgColor(nameRow)).toBe(true);
    expect(await hasBgColor(versionRow)).toBe(true);
    expect(await bgColorsMatch(nameRow, versionRow)).toBe(true);
  });

  test("Shift+click selects a range of form rows", async ({ page }) => {
    await formRow(page, "name").click();
    await formRow(page, "private").click({ modifiers: ["Shift"] });

    const nameRow = formRow(page, "name");
    const versionRow = formRow(page, "version");
    const privateRow = formRow(page, "private");

    expect(await hasBgColor(nameRow)).toBe(true);
    expect(await bgColorsMatch(nameRow, versionRow)).toBe(true);
    expect(await bgColorsMatch(versionRow, privateRow)).toBe(true);
  });

  test("Shift+ArrowDown extends form selection", async ({ page }) => {
    await formRow(page, "name").click();
    await page.locator(formSelector).press("Shift+ArrowDown");

    const nameRow = formRow(page, "name");
    const versionRow = formRow(page, "version");

    expect(await hasBgColor(versionRow)).toBe(true);
    expect(await bgColorsMatch(nameRow, versionRow)).toBe(true);
  });

  test("Delete removes all selected form rows", async ({ page }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await formRow(page, "name").click();
    await formRow(page, "version").click({ modifiers: [mod] });

    await page.locator(formSelector).press("Delete");

    await expect(formRow(page, "name")).toHaveCount(0);
    await expect(formRow(page, "version")).toHaveCount(0);
  });

  test("Enter collapses multi-selection to the last selected node and enters edit mode", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await formRow(page, "name").click();
    await formRow(page, "version").click({ modifiers: [mod] });

    await page.locator(formSelector).press("Enter");

    const nameRow = formRow(page, "name");
    expect(await hasBgColor(nameRow)).toBe(false);

    const versionInput = page.locator(`${formSelector} input[value='1.0.0']`);
    await expect(versionInput).toBeVisible();
  });
});

test.describe("multi-select: keyboard nav preserves form root", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(treeSelector);
    await page.waitForSelector(formSelector);
  });

  test("ArrowDown in tree does not change the breadcrumb path", async ({
    page,
  }) => {
    await treeItem(page, "scripts").click();

    const formWrapper = page.locator(`${formSelector}`).locator("..");
    const bcInput = formWrapper.locator("input").first();
    const pathBefore = await bcInput.inputValue();

    await page.locator(treeSelector).press("ArrowDown");
    await page.locator(treeSelector).press("ArrowDown");
    await page.locator(treeSelector).press("ArrowDown");

    const pathAfter = await bcInput.inputValue();
    expect(pathAfter).toBe(pathBefore);
  });

  test("ArrowUp in tree does not change the breadcrumb path", async ({
    page,
  }) => {
    await treeItem(page, "dependencies").click();

    const formWrapper = page.locator(`${formSelector}`).locator("..");
    const bcInput = formWrapper.locator("input").first();
    const pathBefore = await bcInput.inputValue();

    await page.locator(treeSelector).press("ArrowUp");
    await page.locator(treeSelector).press("ArrowUp");

    const pathAfter = await bcInput.inputValue();
    expect(pathAfter).toBe(pathBefore);
  });
});

test.describe("multi-select: tree delete edge cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(treeSelector);
  });

  test("deleting all children leaves the root visible", async ({ page }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "name").click();
    await treeItem(page, "version").click({ modifiers: [mod] });
    await treeItem(page, "private").click({ modifiers: [mod] });
    await treeItem(page, "scripts").click({ modifiers: [mod] });
    await treeItem(page, "dependencies").click({ modifiers: [mod] });
    await treeItem(page, "devDependencies").click({ modifiers: [mod] });
    await treeItem(page, "engines").click({ modifiers: [mod] });

    await page.locator(treeSelector).press("Delete");

    const root = treeItem(page, "/");
    await expect(root).toBeVisible();
    const remaining = await page
      .locator(`${treeSelector} [role='treeitem']`)
      .all();
    expect(remaining).toHaveLength(1);
  });
});

test.describe("multi-select: cross-parent drag preserves state", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(treeSelector);
  });

  test("expanded container stays expanded after cross-parent drag", async ({
    page,
  }) => {
    const scriptsItem = treeItem(page, "scripts");
    await scriptsItem.click();

    const isExpanded = await scriptsItem
      .locator("[role='treeitem']")
      .first()
      .isVisible()
      .catch(() => false);

    if (!isExpanded) {
      await page.locator(treeSelector).press("ArrowRight");
    }

    const devChild = treeItem(page, "dev");
    await expect(devChild).toBeVisible();

    const target = treeItem(page, "dependencies");
    const targetBox = await target.boundingBox();
    await scriptsItem.dragTo(target, {
      force: true,
      targetPosition: { x: targetBox!.width / 2, y: targetBox!.height - 2 },
    });

    const scriptsAfter = treeItem(page, "scripts");
    await expect(scriptsAfter).toBeVisible();

    const devAfter = treeItem(page, "dev");
    await expect(devAfter).toBeVisible();
  });
});

test.describe("multi-select: cross-view sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(treeSelector);
    await page.waitForSelector(formSelector);
  });

  test("Ctrl+click in form reflects in tree aria-selected", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "/").click();

    await formRow(page, "name").click();
    await formRow(page, "version").click({ modifiers: [mod] });

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(2);
  });

  test("selecting in tree then Ctrl+clicking in form merges selection", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "/").click();
    await formRow(page, "name").click({ modifiers: [mod] });

    const selected = await selectedTreeItems(page);
    expect(selected).toHaveLength(2);
  });
});

test.describe("multi-select: Escape clears selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(treeSelector);
    await page.waitForSelector(formSelector);
  });

  test("first Escape collapses multi-selection to focused node, second clears", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "name").click();
    await treeItem(page, "version").click({ modifiers: [mod] });
    expect(await selectedTreeItems(page)).toHaveLength(2);

    await page.locator(treeSelector).press("Escape");

    const afterFirst = await selectedTreeItems(page);
    expect(afterFirst).toHaveLength(1);
    await expect(
      page.locator(`${treeSelector} [role='treeitem'][aria-selected='true']`),
    ).toContainText("version");

    await page.locator(treeSelector).press("Escape");

    const afterSecond = await selectedTreeItems(page);
    expect(afterSecond).toHaveLength(0);
  });

  test("first Escape collapses form multi-selection to focused node, second clears", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "/").click();

    await formRow(page, "name").click();
    await formRow(page, "version").click({ modifiers: [mod] });

    expect(await hasBgColor(formRow(page, "name"))).toBe(true);

    await page.locator(formSelector).press("Escape");

    expect(await hasBgColor(formRow(page, "name"))).toBe(false);
    expect(await hasBgColor(formRow(page, "version"))).toBe(true);

    await page.locator(formSelector).press("Escape");
    await page.mouse.move(0, 0);

    expect(await hasBgColor(formRow(page, "name"))).toBe(false);
    expect(await hasBgColor(formRow(page, "version"))).toBe(false);
  });

  test("Escape while editing in form reverts edit without clearing edit state", async ({
    page,
  }) => {
    await treeItem(page, "/").click();

    await formRow(page, "name").click();
    await page.locator(formSelector).press("Enter");

    const input = page.locator(`${formSelector} input`).first();
    await expect(input).toBeVisible();
    await input.fill("changed-value");

    await page.locator(formSelector).press("Escape");

    await expect(
      page.locator(`${formSelector} input[value='changed-value']`),
    ).toHaveCount(0);
  });
});

test.describe("multi-select: Cmd+A select all", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(treeSelector);
    await page.waitForSelector(formSelector);
  });

  test("Cmd+A in tree selects all siblings at the focused level", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "name").click();
    await page.locator(treeSelector).press(`${mod}+a`);

    const selected = await selectedTreeItems(page);
    expect(selected.length).toBeGreaterThanOrEqual(7);
  });

  test("pressing Cmd+A again when all siblings selected expands to parent level", async ({
    page,
  }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "scripts").click();
    await page.locator(treeSelector).press("ArrowRight");

    await treeItem(page, "dev").click();
    await page.locator(treeSelector).press(`${mod}+a`);

    const firstSelected = await selectedTreeItems(page);
    const firstCount = firstSelected.length;

    await page.locator(treeSelector).press(`${mod}+a`);

    const secondSelected = await selectedTreeItems(page);
    expect(secondSelected.length).toBeGreaterThan(firstCount);
  });

  test("Cmd+A in form selects all visible siblings", async ({ page }) => {
    const mod = process.platform === "darwin" ? "Meta" : "Control";

    await treeItem(page, "/").click();
    await formRow(page, "name").click();
    await page.locator(formSelector).press(`${mod}+a`);

    const selected = await selectedTreeItems(page);
    expect(selected.length).toBeGreaterThanOrEqual(7);
  });
});
