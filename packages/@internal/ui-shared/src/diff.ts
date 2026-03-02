import type { DiffType } from "@visual-json/core";

export const DIFF_COLORS: Record<
  DiffType,
  { bg: string; marker: string; label: string }
> = {
  added: { bg: "#1e3a1e", marker: "+", label: "#4ec94e" },
  removed: { bg: "#3a1e1e", marker: "-", label: "#f48771" },
  changed: { bg: "#3a3a1e", marker: "~", label: "#dcdcaa" },
};

export function formatValue(value: unknown): string {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "object") {
    const json = JSON.stringify(value, null, 2);
    if (json.length > 80) {
      return JSON.stringify(value).slice(0, 77) + "...";
    }
    return json;
  }
  return String(value);
}
