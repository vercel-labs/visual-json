import type { JsonValue } from "./types";

export type DiffType = "added" | "removed" | "changed";

export interface DiffEntry {
  path: string;
  type: DiffType;
  oldValue?: JsonValue;
  newValue?: JsonValue;
}

export function computeDiff(
  original: JsonValue,
  current: JsonValue,
  path = "",
): DiffEntry[] {
  const entries: DiffEntry[] = [];

  if (original === current) {
    return entries;
  }

  if (
    original === null ||
    current === null ||
    typeof original !== typeof current ||
    Array.isArray(original) !== Array.isArray(current)
  ) {
    if (path) {
      entries.push({
        path,
        type: "changed",
        oldValue: original,
        newValue: current,
      });
    } else {
      diffObject(original, current, path, entries);
    }
    return entries;
  }

  if (typeof original !== "object") {
    if (original !== current) {
      entries.push({
        path: path || "/",
        type: "changed",
        oldValue: original,
        newValue: current,
      });
    }
    return entries;
  }

  if (Array.isArray(original) && Array.isArray(current)) {
    const maxLen = Math.max(original.length, current.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = path ? `${path}/${i}` : `/${i}`;
      if (i >= original.length) {
        entries.push({ path: childPath, type: "added", newValue: current[i] });
      } else if (i >= current.length) {
        entries.push({
          path: childPath,
          type: "removed",
          oldValue: original[i],
        });
      } else {
        entries.push(...computeDiff(original[i], current[i], childPath));
      }
    }
    return entries;
  }

  diffObject(original, current, path, entries);
  return entries;
}

function diffObject(
  original: JsonValue,
  current: JsonValue,
  path: string,
  entries: DiffEntry[],
) {
  const origObj =
    original !== null &&
    typeof original === "object" &&
    !Array.isArray(original)
      ? (original as Record<string, JsonValue>)
      : {};
  const currObj =
    current !== null && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, JsonValue>)
      : {};

  const allKeys = new Set([...Object.keys(origObj), ...Object.keys(currObj)]);

  for (const key of allKeys) {
    const childPath = path ? `${path}/${key}` : `/${key}`;
    const inOriginal = key in origObj;
    const inCurrent = key in currObj;

    if (!inOriginal && inCurrent) {
      entries.push({ path: childPath, type: "added", newValue: currObj[key] });
    } else if (inOriginal && !inCurrent) {
      entries.push({
        path: childPath,
        type: "removed",
        oldValue: origObj[key],
      });
    } else {
      entries.push(...computeDiff(origObj[key], currObj[key], childPath));
    }
  }
}

export function getDiffPaths(entries: DiffEntry[]): Map<string, DiffType> {
  const map = new Map<string, DiffType>();
  for (const entry of entries) {
    map.set(entry.path, entry.type);
  }
  return map;
}
