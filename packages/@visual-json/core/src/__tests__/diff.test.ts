import { describe, it, expect } from "vitest";
import { computeDiff, getDiffPaths } from "../diff";

describe("computeDiff", () => {
  it("returns empty for identical values", () => {
    expect(computeDiff(42, 42)).toEqual([]);
    expect(computeDiff("a", "a")).toEqual([]);
    expect(computeDiff(null, null)).toEqual([]);
  });

  it("detects primitive changes", () => {
    const entries = computeDiff(1, 2);
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("changed");
    expect(entries[0].oldValue).toBe(1);
    expect(entries[0].newValue).toBe(2);
  });

  it("detects added object properties", () => {
    const entries = computeDiff({ a: 1 }, { a: 1, b: 2 });
    const added = entries.filter((e) => e.type === "added");
    expect(added).toHaveLength(1);
    expect(added[0].path).toBe("/b");
    expect(added[0].newValue).toBe(2);
  });

  it("detects removed object properties", () => {
    const entries = computeDiff({ a: 1, b: 2 }, { a: 1 });
    const removed = entries.filter((e) => e.type === "removed");
    expect(removed).toHaveLength(1);
    expect(removed[0].path).toBe("/b");
    expect(removed[0].oldValue).toBe(2);
  });

  it("detects changed object properties", () => {
    const entries = computeDiff({ a: 1 }, { a: 99 });
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("changed");
    expect(entries[0].path).toBe("/a");
  });

  it("handles nested object diffs", () => {
    const orig = { x: { y: 1 } };
    const curr = { x: { y: 2 } };
    const entries = computeDiff(orig, curr);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe("/x/y");
    expect(entries[0].type).toBe("changed");
  });

  it("detects added array elements", () => {
    const entries = computeDiff([1, 2], [1, 2, 3]);
    const added = entries.filter((e) => e.type === "added");
    expect(added).toHaveLength(1);
    expect(added[0].path).toBe("/2");
  });

  it("detects removed array elements", () => {
    const entries = computeDiff([1, 2, 3], [1, 2]);
    const removed = entries.filter((e) => e.type === "removed");
    expect(removed).toHaveLength(1);
    expect(removed[0].path).toBe("/2");
  });

  it("detects changed array elements", () => {
    const entries = computeDiff([1, 2], [1, 99]);
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe("/1");
    expect(entries[0].type).toBe("changed");
  });

  it("handles type changes", () => {
    const entries = computeDiff({ a: "string" }, { a: 42 });
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("changed");
  });

  it("handles null to object", () => {
    const entries = computeDiff({ a: null }, { a: { b: 1 } });
    expect(entries.length).toBeGreaterThan(0);
  });

  it("returns empty for identical objects", () => {
    const obj = { a: 1, b: { c: [1, 2] } };
    expect(computeDiff(obj, structuredClone(obj))).toEqual([]);
  });

  it("never emits unchanged entries", () => {
    const entries = computeDiff({ a: 1, b: 2, c: 3 }, { a: 1, b: 99, d: 4 });
    for (const e of entries) {
      expect(e.type).not.toBe("unchanged");
    }
  });
});

describe("getDiffPaths", () => {
  it("returns a map of paths to diff types", () => {
    const entries = computeDiff({ a: 1, b: 2 }, { a: 99, c: 3 });
    const map = getDiffPaths(entries);
    expect(map.get("/a")).toBe("changed");
    expect(map.get("/b")).toBe("removed");
    expect(map.get("/c")).toBe("added");
  });
});
