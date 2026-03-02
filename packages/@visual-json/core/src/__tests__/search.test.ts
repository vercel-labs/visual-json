import { describe, it, expect, beforeEach } from "vitest";
import { fromJson, resetIdCounter } from "../tree";
import { searchNodes, getAncestorIds } from "../search";

beforeEach(() => {
  resetIdCounter();
});

describe("searchNodes", () => {
  it("returns empty for blank query", () => {
    const state = fromJson({ name: "Alice" });
    expect(searchNodes(state, "")).toEqual([]);
    expect(searchNodes(state, "   ")).toEqual([]);
  });

  it("matches keys", () => {
    const state = fromJson({ username: "alice", email: "a@b.com" });
    const matches = searchNodes(state, "user");
    expect(matches).toHaveLength(1);
    expect(matches[0].field).toBe("key");
  });

  it("matches values", () => {
    const state = fromJson({ name: "Alice" });
    const matches = searchNodes(state, "alice");
    expect(matches).toHaveLength(1);
    expect(matches[0].field).toBe("value");
  });

  it("is case-insensitive", () => {
    const state = fromJson({ Name: "ALICE" });
    expect(searchNodes(state, "name")).toHaveLength(1);
    expect(searchNodes(state, "alice")).toHaveLength(1);
  });

  it("matches across nested structures", () => {
    const state = fromJson({ a: { b: { target: "found" } } });
    const matches = searchNodes(state, "target");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("returns both key and value matches for same node", () => {
    const state = fromJson({ test: "test" });
    const matches = searchNodes(state, "test");
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.field).sort()).toEqual(["key", "value"]);
  });

  it("matches numeric values", () => {
    const state = fromJson({ count: 42 });
    const matches = searchNodes(state, "42");
    expect(matches).toHaveLength(1);
    expect(matches[0].field).toBe("value");
  });
});

describe("getAncestorIds", () => {
  it("returns empty for root-level nodes", () => {
    const state = fromJson({ a: 1 });
    const ancestors = getAncestorIds(state, [state.root.id]);
    expect(ancestors.size).toBe(0);
  });

  it("returns parent IDs for nested nodes", () => {
    const state = fromJson({ a: { b: { c: 1 } } });
    const c = state.root.children[0].children[0].children[0];
    const ancestors = getAncestorIds(state, [c.id]);
    expect(ancestors.has(state.root.id)).toBe(true);
    expect(ancestors.has(state.root.children[0].id)).toBe(true);
    expect(ancestors.has(state.root.children[0].children[0].id)).toBe(true);
    expect(ancestors.has(c.id)).toBe(false);
  });

  it("merges ancestors for multiple nodes", () => {
    const state = fromJson({ a: { x: 1 }, b: { y: 2 } });
    const x = state.root.children[0].children[0];
    const y = state.root.children[1].children[0];
    const ancestors = getAncestorIds(state, [x.id, y.id]);
    expect(ancestors.has(state.root.id)).toBe(true);
    expect(ancestors.has(state.root.children[0].id)).toBe(true);
    expect(ancestors.has(state.root.children[1].id)).toBe(true);
  });
});
