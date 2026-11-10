import type { Page } from "@playwright/test";

const treeSelector = "[role='tree']";
const hydratedSelector = "[data-vj-hydrated='true']";

/**
 * Open the editor and wait until it is interactive.
 *
 * The page is server rendered, so the editor markup appears before React has
 * hydrated it. Clicks made during that window are dropped because no event
 * handlers are attached yet. `data-vj-hydrated` is set by the editor's effect
 * after hydration, so waiting for it keeps the first interaction from racing
 * the client render.
 */
export async function openEditor(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector(treeSelector);
  await page.waitForSelector(hydratedSelector);
}
