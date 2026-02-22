import { test, expect } from "@playwright/test";

const rawTextarea = 'textarea[spellcheck="false"]';

test.describe("editor tree/raw sync", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-form-container]");
  });

  test("tree edit syncs to raw mode", async ({ page }) => {
    const nameValue = page.getByText("my-app", { exact: true });
    await expect(nameValue).toBeVisible();

    await nameValue.dblclick();

    const input = page.locator("input[value='my-app']");
    await expect(input).toBeVisible();
    await input.fill("changed-app");

    await page.keyboard.press("Enter");

    await page.getByRole("radio", { name: "Raw" }).click();

    const textarea = page.locator(rawTextarea);
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(/"changed-app"/);
  });

  test("raw edit syncs to tree mode", async ({ page }) => {
    await page.getByRole("radio", { name: "Raw" }).click();

    const textarea = page.locator(rawTextarea);
    await expect(textarea).toBeVisible();

    const current = await textarea.inputValue();
    const updated = current.replace('"my-app"', '"raw-edited"');
    await textarea.fill(updated);

    await page.getByRole("radio", { name: "Tree" }).click();

    await expect(page.getByText("raw-edited", { exact: true })).toBeVisible();
  });
});
