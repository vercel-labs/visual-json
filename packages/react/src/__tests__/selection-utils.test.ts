import { describe, it, expect, beforeEach } from "vitest";
import { fromJson, resetIdCounter } from "@visual-json/core";
import { getVisibleNodes } from "../get-visible-nodes";
import { computeRangeIds, deleteSelectedNodes } from "../selection-utils";

beforeEach(() => {
  resetIdCounter();
});

describe("computeRangeIds", () => {
  it("returns IDs between anchor and target (inclusive)", () => {
    const state = fromJson({ a: 1, b: 2, c: 3 });
    const visible = getVisibleNodes(state.root, () => true);
    const [, a, b, c] = visible;
    const result = computeRangeIds(visible, a.id, c.id);
    expect(result).toEqual(new Set([a.id, b.id, c.id]));
  });

  it("works when target is before anchor", () => {
    const state = fromJson({ a: 1, b: 2, c: 3 });
    const visible = getVisibleNodes(state.root, () => true);
    const [, a, , c] = visible;
    const result = computeRangeIds(visible, c.id, a.id);
    expect(result).toEqual(new Set([a.id, visible[2].id, c.id]));
  });

  it("returns null when anchor is not in visible list", () => {
    const state = fromJson({ a: 1 });
    const visible = getVisibleNodes(state.root, () => true);
    const result = computeRangeIds(visible, "nonexistent", visible[0].id);
    expect(result).toBeNull();
  });
});

describe("deleteSelectedNodes", () => {
  it("returns next sibling after deleting a single node", () => {
    const state = fromJson({ a: 1, b: 2, c: 3 });
    const visible = getVisibleNodes(state.root, () => true);
    const b = state.root.children[1];
    const c = state.root.children[2];

    const { newTree, nextFocusId } = deleteSelectedNodes(
      state,
      new Set([b.id]),
      visible,
    );
    expect(nextFocusId).toBe(c.id);
    expect(newTree.nodesById.has(b.id)).toBe(false);
  });

  it("skips descendants of deleted containers when picking nextFocusId", () => {
    const state = fromJson({ obj: { child: 1 }, after: 2 });
    const visible = getVisibleNodes(state.root, () => true);
    // visible: [root, obj, child, after]
    const obj = state.root.children[0];
    const child = obj.children[0];
    const after = state.root.children[1];

    const { newTree, nextFocusId } = deleteSelectedNodes(
      state,
      new Set([obj.id]),
      visible,
    );

    expect(newTree.nodesById.has(obj.id)).toBe(false);
    expect(newTree.nodesById.has(child.id)).toBe(false);
    expect(nextFocusId).toBe(after.id);
  });

  it("falls back to previous node when no successor exists", () => {
    const state = fromJson({ a: 1, b: 2 });
    const visible = getVisibleNodes(state.root, () => true);
    const a = state.root.children[0];
    const b = state.root.children[1];

    const { nextFocusId } = deleteSelectedNodes(
      state,
      new Set([b.id]),
      visible,
    );
    expect(nextFocusId).toBe(a.id);
  });

  it("returns null when all deletable nodes are removed", () => {
    const state = fromJson({ a: 1 });
    const visible = getVisibleNodes(state.root, () => true);
    const a = state.root.children[0];

    const { nextFocusId } = deleteSelectedNodes(
      state,
      new Set([a.id]),
      visible,
    );
    // Only the root remains, and it's in the visible list
    expect(nextFocusId).toBe(state.root.id);
  });

  it("does not delete the root node", () => {
    const state = fromJson({ a: 1 });
    const visible = getVisibleNodes(state.root, () => true);

    const { newTree } = deleteSelectedNodes(
      state,
      new Set([state.root.id]),
      visible,
    );
    expect(newTree).toBe(state);
  });

  it("skips descendants when parent is also selected", () => {
    const state = fromJson({ obj: { child: 1 }, after: 2 });
    const visible = getVisibleNodes(state.root, () => true);
    const obj = state.root.children[0];
    const child = obj.children[0];
    const after = state.root.children[1];

    const { newTree, nextFocusId } = deleteSelectedNodes(
      state,
      new Set([obj.id, child.id]),
      visible,
    );

    expect(newTree.nodesById.has(obj.id)).toBe(false);
    expect(newTree.nodesById.has(child.id)).toBe(false);
    expect(newTree.nodesById.has(after.id)).toBe(true);
    expect(nextFocusId).toBe(after.id);
  });

  it("skips deeply nested descendants when ancestor is selected", () => {
    const state = fromJson({ obj: { inner: { deep: 1 } }, after: 2 });
    const visible = getVisibleNodes(state.root, () => true);
    const obj = state.root.children[0];
    const inner = obj.children[0];
    const deep = inner.children[0];
    const after = state.root.children[1];

    const { newTree, nextFocusId } = deleteSelectedNodes(
      state,
      new Set([obj.id, deep.id]),
      visible,
    );

    expect(newTree.nodesById.has(obj.id)).toBe(false);
    expect(newTree.nodesById.has(inner.id)).toBe(false);
    expect(newTree.nodesById.has(deep.id)).toBe(false);
    expect(newTree.nodesById.has(after.id)).toBe(true);
    expect(nextFocusId).toBe(after.id);
  });
});
