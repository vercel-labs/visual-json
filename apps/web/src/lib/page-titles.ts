/**
 * Single source of truth for page titles.
 * Used by both page metadata exports and the OG image route.
 *
 * Keys mirror the page's URL path (e.g., "docs/core" → /og/docs/core).
 * Values are display titles (without the "| visual-json" suffix — the layout template adds that).
 */
export const PAGE_TITLES: Record<string, string> = {
  "": "The Visual JSON\nEditor for Humans",

  "docs/getting-started": "Getting Started",
  "docs/core": "Core API",
  "docs/react": "React Components",
  "docs/vue": "Vue Components",
  "docs/changelog": "Changelog",
};

export function getPageTitle(slug: string): string | null {
  return slug in PAGE_TITLES ? PAGE_TITLES[slug]! : null;
}
