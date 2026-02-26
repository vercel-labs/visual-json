import { test, expect, type Page } from "@playwright/test";

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

    const form = page.locator(formSelector);
    const selectedRows = form.locator("[data-form-node-id]").filter({
      has: page.locator("[style]"),
    });

    const nameRow = formRow(page, "name");
    const versionRow = formRow(page, "version");

    const nameBg = await nameRow.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const versionBg = await versionRow.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    expect(nameBg).not.toBe("rgba(0, 0, 0, 0)");
    expect(versionBg).not.toBe("rgba(0, 0, 0, 0)");
    expect(nameBg).toBe(versionBg);
  });

  test("Shift+click selects a range of form rows", async ({ page }) => {
    await formRow(page, "name").click();
    await formRow(page, "private").click({ modifiers: ["Shift"] });

    const nameRow = formRow(page, "name");
    const versionRow = formRow(page, "version");
    const privateRow = formRow(page, "private");

    const nameBg = await nameRow.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const versionBg = await versionRow.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const privateBg = await privateRow.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    expect(nameBg).not.toBe("rgba(0, 0, 0, 0)");
    expect(nameBg).toBe(versionBg);
    expect(versionBg).toBe(privateBg);
  });

  test("Shift+ArrowDown extends form selection", async ({ page }) => {
    await formRow(page, "name").click();
    await page.locator(formSelector).press("Shift+ArrowDown");

    const versionRow = formRow(page, "version");
    const versionBg = await versionRow.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(versionBg).not.toBe("rgba(0, 0, 0, 0)");

    const nameRow = formRow(page, "name");
    const nameBg = await nameRow.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(nameBg).toBe(versionBg);
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
    const nameBg = await nameRow.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(nameBg).toBe("rgba(0, 0, 0, 0)");

    const versionInput = page.locator(`${formSelector} input[value='1.0.0']`);
    await expect(versionInput).toBeVisible();
  });
});
