import { describe, it, expect, beforeEach } from "vitest";
import { fromJson, resetIdCounter } from "@visual-json/core";
import { getVisibleNodes } from "../get-visible-nodes";
import {
  computeRangeIds,
  computeSelectAllIds,
  deleteSelectedNodes,
} from "../selection-utils";

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

describe("computeSelectAllIds", () => {
  it("selects all siblings at the focused node's level", () => {
    const state = fromJson({ a: 1, b: 2, c: 3 });
    const [a, b, c] = state.root.children;
    const result = computeSelectAllIds(state, b.id, new Set([b.id]));
    expect(result).toEqual(new Set([a.id, b.id, c.id]));
  });

  it("goes up a level when all siblings are already selected", () => {
    const state = fromJson({ obj: { x: 1, y: 2 }, other: 3 });
    const obj = state.root.children[0];
    const other = state.root.children[1];
    const [x, y] = obj.children;
    const result = computeSelectAllIds(state, x.id, new Set([x.id, y.id]));
    expect(result).toEqual(new Set([obj.id, other.id]));
  });

  it("stays at root level when everything is selected", () => {
    const state = fromJson({ a: 1, b: 2 });
    const [a, b] = state.root.children;
    const result = computeSelectAllIds(state, a.id, new Set([a.id, b.id]));
    expect(result).toEqual(new Set([a.id, b.id]));
  });

  it("returns null when focusedNodeId is null", () => {
    const state = fromJson({ a: 1 });
    const result = computeSelectAllIds(state, null, new Set());
    expect(result).toBeNull();
  });

  it("returns null when focusedNodeId is not in the tree", () => {
    const state = fromJson({ a: 1 });
    const result = computeSelectAllIds(state, "nonexistent", new Set());
    expect(result).toBeNull();
  });

  it("selects single child when focused on the only child", () => {
    const state = fromJson({ wrapper: { only: 1 } });
    const only = state.root.children[0].children[0];
    const result = computeSelectAllIds(state, only.id, new Set());
    expect(result).toEqual(new Set([only.id]));
  });

  it("escalates through multiple levels", () => {
    const state = fromJson({ obj: { inner: { a: 1 } }, sibling: 2 });
    const obj = state.root.children[0];
    const sibling = state.root.children[1];
    const inner = obj.children[0];
    const a = inner.children[0];
    // a is the only child of inner, inner is the only child of obj
    // First call: all siblings of a selected (just a) -> go up -> inner is only child -> go up -> [obj, sibling]
    const result = computeSelectAllIds(state, a.id, new Set([a.id]));
    expect(result).toEqual(new Set([inner.id]));

    const result2 = computeSelectAllIds(state, a.id, new Set([a.id, inner.id]));
    expect(result2).toEqual(new Set([obj.id, sibling.id]));
  });
});
