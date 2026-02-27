import { describe, it, expect, beforeEach } from "vitest";
import {
  fromJson,
  toJson,
  resetIdCounter,
  setValue,
  setKey,
  addProperty,
  insertProperty,
  insertNode,
  removeNode,
  moveNode,
  reorderChildren,
  reorderChildrenMulti,
  changeType,
  duplicateNode,
} from "../../src";

beforeEach(() => {
  resetIdCounter();
});

describe("setValue", () => {
  it("updates a primitive value", () => {
    const state = fromJson({ a: 1 });
    const child = state.root.children[0];
    const next = setValue(state, child.id, 42);
    expect(toJson(next.root)).toEqual({ a: 42 });
  });

  it("preserves sibling IDs", () => {
    const state = fromJson({ a: 1, b: 2 });
    const [a, b] = state.root.children;
    const next = setValue(state, a.id, 99);
    const newB = next.root.children.find((c) => c.key === "b");
    expect(newB?.id).toBe(b.id);
  });

  it("preserves root ID", () => {
    const state = fromJson({ a: 1 });
    const child = state.root.children[0];
    const next = setValue(state, child.id, 99);
    expect(next.root.id).toBe(state.root.id);
  });

  it("replaces a primitive with an object", () => {
    const state = fromJson({ a: 1 });
    const child = state.root.children[0];
    const next = setValue(state, child.id, { nested: true });
    expect(toJson(next.root)).toEqual({ a: { nested: true } });
    expect(next.root.children[0].id).toBe(child.id);
  });

  it("replaces the root value", () => {
    const state = fromJson(42);
    const next = setValue(state, state.root.id, "hello");
    expect(toJson(next.root)).toBe("hello");
  });
});

describe("setKey", () => {
  it("renames an object key", () => {
    const state = fromJson({ old: 1 });
    const child = state.root.children[0];
    const next = setKey(state, child.id, "renamed");
    expect(toJson(next.root)).toEqual({ renamed: 1 });
  });

  it("updates paths of children after rename", () => {
    const state = fromJson({ parent: { child: 1 } });
    const parent = state.root.children[0];
    const next = setKey(state, parent.id, "newParent");
    const child = next.root.children[0].children[0];
    expect(child.path).toBe("/newParent/child");
  });

  it("does not rename array item keys", () => {
    const state = fromJson([1, 2]);
    const child = state.root.children[0];
    const next = setKey(state, child.id, "notAllowed");
    expect(toJson(next.root)).toEqual([1, 2]);
  });
});

describe("addProperty", () => {
  it("adds to an object", () => {
    const state = fromJson({ a: 1 });
    const next = addProperty(state, state.root.id, "b", 2);
    expect(toJson(next.root)).toEqual({ a: 1, b: 2 });
  });

  it("appends to an array", () => {
    const state = fromJson([1, 2]);
    const next = addProperty(state, state.root.id, "2", 3);
    expect(toJson(next.root)).toEqual([1, 2, 3]);
  });

  it("preserves existing child IDs", () => {
    const state = fromJson({ a: 1 });
    const aId = state.root.children[0].id;
    const next = addProperty(state, state.root.id, "b", 2);
    const aNode = next.root.children.find((c) => c.key === "a");
    expect(aNode?.id).toBe(aId);
  });
});

describe("removeNode", () => {
  it("removes a property from an object", () => {
    const state = fromJson({ a: 1, b: 2 });
    const a = state.root.children.find((c) => c.key === "a")!;
    const next = removeNode(state, a.id);
    expect(toJson(next.root)).toEqual({ b: 2 });
  });

  it("removes an item from an array and re-indexes", () => {
    const state = fromJson([10, 20, 30]);
    const mid = state.root.children[1];
    const next = removeNode(state, mid.id);
    expect(toJson(next.root)).toEqual([10, 30]);
    expect(next.root.children[0].key).toBe("0");
    expect(next.root.children[1].key).toBe("1");
  });

  it("preserves IDs of remaining siblings", () => {
    const state = fromJson({ a: 1, b: 2, c: 3 });
    const b = state.root.children.find((c) => c.key === "b")!;
    const cId = state.root.children.find((c) => c.key === "c")!.id;
    const next = removeNode(state, b.id);
    const cNode = next.root.children.find((c) => c.key === "c");
    expect(cNode?.id).toBe(cId);
  });

  it("does not remove the root", () => {
    const state = fromJson({ a: 1 });
    const next = removeNode(state, state.root.id);
    expect(next).toBe(state);
  });
});

describe("moveNode", () => {
  it("moves a node to a new parent", () => {
    const state = fromJson({ src: { val: 1 }, dst: {} });
    const val = state.root.children[0].children[0];
    const dst = state.root.children[1];
    const next = moveNode(state, val.id, dst.id);
    expect(toJson(next.root)).toEqual({ src: {}, dst: { val: 1 } });
  });

  it("moves within the same parent at a specific index", () => {
    const state = fromJson([10, 20, 30]);
    const last = state.root.children[2];
    const next = moveNode(state, last.id, state.root.id, 0);
    expect(toJson(next.root)).toEqual([30, 10, 20]);
  });
});

describe("reorderChildren", () => {
  it("reorders object keys", () => {
    const state = fromJson({ a: 1, b: 2, c: 3 });
    const next = reorderChildren(state, state.root.id, 0, 2);
    expect(Object.keys(toJson(next.root) as Record<string, unknown>)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("reorders array elements and re-indexes", () => {
    const state = fromJson([10, 20, 30]);
    const next = reorderChildren(state, state.root.id, 2, 0);
    expect(toJson(next.root)).toEqual([30, 10, 20]);
    expect(next.root.children.map((c) => c.key)).toEqual(["0", "1", "2"]);
  });
});

describe("changeType", () => {
  it("converts a string to a number", () => {
    const state = fromJson({ val: "42" });
    const child = state.root.children[0];
    const next = changeType(state, child.id, "number");
    expect(toJson(next.root)).toEqual({ val: 42 });
  });

  it("converts a number to a string", () => {
    const state = fromJson({ val: 42 });
    const child = state.root.children[0];
    const next = changeType(state, child.id, "string");
    expect(toJson(next.root)).toEqual({ val: "42" });
  });

  it("converts a primitive to an array", () => {
    const state = fromJson({ val: 5 });
    const child = state.root.children[0];
    const next = changeType(state, child.id, "array");
    expect(toJson(next.root)).toEqual({ val: [5] });
  });

  it("converts to null", () => {
    const state = fromJson({ val: "hello" });
    const child = state.root.children[0];
    const next = changeType(state, child.id, "null");
    expect(toJson(next.root)).toEqual({ val: null });
  });
});

describe("duplicateNode", () => {
  it("duplicates an object property", () => {
    const state = fromJson({ a: 1, b: 2 });
    const a = state.root.children[0];
    const next = duplicateNode(state, a.id);
    const json = toJson(next.root) as Record<string, unknown>;
    expect(json).toEqual({ a: 1, a_copy: 1, b: 2 });
  });

  it("duplicates an array item", () => {
    const state = fromJson([10, 20]);
    const first = state.root.children[0];
    const next = duplicateNode(state, first.id);
    expect(toJson(next.root)).toEqual([10, 10, 20]);
  });

  it("assigns a new ID to the duplicate", () => {
    const state = fromJson({ a: 1 });
    const a = state.root.children[0];
    const next = duplicateNode(state, a.id);
    const ids = next.root.children.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not duplicate the root", () => {
    const state = fromJson({ a: 1 });
    const next = duplicateNode(state, state.root.id);
    expect(next).toBe(state);
  });
});

describe("insertProperty", () => {
  it("inserts at the beginning", () => {
    const state = fromJson({ a: 1, b: 2 });
    const next = insertProperty(state, state.root.id, "z", 0, 0);
    expect(Object.keys(toJson(next.root) as Record<string, unknown>)).toEqual([
      "z",
      "a",
      "b",
    ]);
  });

  it("inserts at a middle index", () => {
    const state = fromJson({ a: 1, b: 2 });
    const next = insertProperty(state, state.root.id, "mid", 99, 1);
    expect(Object.keys(toJson(next.root) as Record<string, unknown>)).toEqual([
      "a",
      "mid",
      "b",
    ]);
    expect((toJson(next.root) as Record<string, unknown>)["mid"]).toBe(99);
  });

  it("inserts at the end", () => {
    const state = fromJson({ a: 1 });
    const next = insertProperty(state, state.root.id, "b", 2, 1);
    expect(toJson(next.root)).toEqual({ a: 1, b: 2 });
  });

  it("inserts into an array and re-indexes keys", () => {
    const state = fromJson([10, 20, 30]);
    const next = insertProperty(state, state.root.id, "1", 15, 1);
    expect(toJson(next.root)).toEqual([10, 15, 20, 30]);
    expect(next.root.children.map((c) => c.key)).toEqual(["0", "1", "2", "3"]);
  });

  it("returns state unchanged for unknown parent", () => {
    const state = fromJson({ a: 1 });
    const next = insertProperty(state, "nonexistent", "b", 2, 0);
    expect(next).toBe(state);
  });
});

describe("reorderChildrenMulti", () => {
  it("moves multiple adjacent children after a target", () => {
    const state = fromJson({ a: 1, b: 2, c: 3, d: 4 });
    const [a, b, , d] = state.root.children;
    const next = reorderChildrenMulti(
      state,
      state.root.id,
      [a.id, b.id],
      d.id,
      "after",
    );
    expect(Object.keys(toJson(next.root) as Record<string, unknown>)).toEqual([
      "c",
      "d",
      "a",
      "b",
    ]);
  });

  it("moves multiple non-adjacent children before a target", () => {
    const state = fromJson({ a: 1, b: 2, c: 3, d: 4 });
    const [a, , c, d] = state.root.children;
    const next = reorderChildrenMulti(
      state,
      state.root.id,
      [a.id, c.id],
      d.id,
      "before",
    );
    expect(Object.keys(toJson(next.root) as Record<string, unknown>)).toEqual([
      "b",
      "a",
      "c",
      "d",
    ]);
  });

  it("reorders within an array and re-indexes keys", () => {
    const state = fromJson([10, 20, 30, 40]);
    const [first, second] = state.root.children;
    const last = state.root.children[3];
    const next = reorderChildrenMulti(
      state,
      state.root.id,
      [first.id, second.id],
      last.id,
      "after",
    );
    expect(toJson(next.root)).toEqual([30, 40, 10, 20]);
    expect(next.root.children.map((c) => c.key)).toEqual(["0", "1", "2", "3"]);
  });

  it("returns state unchanged for unknown parent", () => {
    const state = fromJson({ a: 1 });
    const next = reorderChildrenMulti(
      state,
      "nonexistent",
      [state.root.children[0].id],
      state.root.children[0].id,
      "before",
    );
    expect(next).toBe(state);
  });

  it("keeps order when moving [a,b] after b (target in moved set)", () => {
    const state = fromJson({ a: 1, b: 2, c: 3, d: 4 });
    const [a, b] = state.root.children;
    const next = reorderChildrenMulti(
      state,
      state.root.id,
      [a.id, b.id],
      b.id,
      "after",
    );
    expect(Object.keys(toJson(next.root) as Record<string, unknown>)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("keeps order when moving [a,b] before a (target in moved set)", () => {
    const state = fromJson({ a: 1, b: 2, c: 3, d: 4 });
    const [a, b] = state.root.children;
    const next = reorderChildrenMulti(
      state,
      state.root.id,
      [a.id, b.id],
      a.id,
      "before",
    );
    expect(Object.keys(toJson(next.root) as Record<string, unknown>)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("keeps order when moving [b,c] after c (target in moved set)", () => {
    const state = fromJson({ a: 1, b: 2, c: 3, d: 4 });
    const [, b, c] = state.root.children;
    const next = reorderChildrenMulti(
      state,
      state.root.id,
      [b.id, c.id],
      c.id,
      "after",
    );
    expect(Object.keys(toJson(next.root) as Record<string, unknown>)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("moves non-adjacent [a,c] after c (target in moved set)", () => {
    const state = fromJson({ a: 1, b: 2, c: 3, d: 4 });
    const [a, , c] = state.root.children;
    const next = reorderChildrenMulti(
      state,
      state.root.id,
      [a.id, c.id],
      c.id,
      "after",
    );
    expect(Object.keys(toJson(next.root) as Record<string, unknown>)).toEqual([
      "b",
      "a",
      "c",
      "d",
    ]);
  });
});

describe("insertNode", () => {
  it("inserts a node while preserving its ID", () => {
    const src = fromJson({ src: { val: 1 }, dst: {} });
    const val = src.root.children[0].children[0];
    const originalId = val.id;
    const removed = removeNode(src, val.id);
    const dst = removed.root.children[1];
    const next = insertNode(removed, dst.id, val, 0);
    const inserted = next.root.children[1].children[0];
    expect(inserted.id).toBe(originalId);
    expect(toJson(next.root)).toEqual({ src: {}, dst: { val: 1 } });
  });

  it("preserves descendant IDs", () => {
    const src = fromJson({ src: { obj: { a: 1, b: 2 } }, dst: {} });
    const obj = src.root.children[0].children[0];
    const childA = obj.children[0];
    const childB = obj.children[1];
    const removed = removeNode(src, obj.id);
    const dst = removed.root.children[1];
    const next = insertNode(removed, dst.id, obj, 0);
    const inserted = next.root.children[1].children[0];
    expect(inserted.id).toBe(obj.id);
    expect(inserted.children[0].id).toBe(childA.id);
    expect(inserted.children[1].id).toBe(childB.id);
  });

  it("updates paths after insertion", () => {
    const src = fromJson({ src: { val: 1 }, dst: {} });
    const val = src.root.children[0].children[0];
    const removed = removeNode(src, val.id);
    const dst = removed.root.children[1];
    const next = insertNode(removed, dst.id, val, 0);
    const inserted = next.root.children[1].children[0];
    expect(inserted.path).toBe("/dst/val");
  });

  it("re-indexes array keys when inserting into an array", () => {
    const state = fromJson({ items: [10, 20, 30], extra: 99 });
    const extra = state.root.children[1];
    const removed = removeNode(state, extra.id);
    const items = removed.root.children[0];
    const next = insertNode(removed, items.id, extra, 1);
    expect(toJson(next.root)).toEqual({ items: [10, 99, 20, 30] });
    expect(next.root.children[0].children.map((c) => c.key)).toEqual([
      "0",
      "1",
      "2",
      "3",
    ]);
  });

  it("returns state unchanged for unknown parent", () => {
    const state = fromJson({ a: 1 });
    const child = state.root.children[0];
    const next = insertNode(state, "nonexistent", child, 0);
    expect(next).toBe(state);
  });

  it("registers inserted nodes in nodesById", () => {
    const src = fromJson({ src: { obj: { deep: 1 } }, dst: {} });
    const obj = src.root.children[0].children[0];
    const deep = obj.children[0];
    const removed = removeNode(src, obj.id);
    const dst = removed.root.children[1];
    const next = insertNode(removed, dst.id, obj, 0);
    expect(next.nodesById.has(obj.id)).toBe(true);
    expect(next.nodesById.has(deep.id)).toBe(true);
    expect(next.nodesById.get(obj.id)?.path).toBe("/dst/obj");
    expect(next.nodesById.get(deep.id)?.path).toBe("/dst/obj/deep");
  });

  it("works correctly with structuredClone'd nodes after removal", () => {
    const state = fromJson({ src: { a: 1, b: 2 }, dst: {} });
    const a = state.root.children[0].children[0];
    const b = state.root.children[0].children[1];
    const snapshotA = structuredClone(a);
    const snapshotB = structuredClone(b);

    let tree = removeNode(state, b.id);
    tree = removeNode(tree, a.id);

    const dst = tree.root.children[1];
    tree = insertNode(tree, dst.id, snapshotA, 0);
    tree = insertNode(tree, dst.id, snapshotB, 1);

    expect(toJson(tree.root)).toEqual({ src: {}, dst: { a: 1, b: 2 } });
    expect(tree.nodesById.get(a.id)?.path).toBe("/dst/a");
    expect(tree.nodesById.get(b.id)?.path).toBe("/dst/b");
  });

  it("cross-parent multi-move preserves IDs with structuredClone", () => {
    const state = fromJson({ src: { obj: { x: 1 } }, dst: { existing: 0 } });
    const obj = state.root.children[0].children[0];
    const x = obj.children[0];
    const snapshot = structuredClone(obj);

    const removed = removeNode(state, obj.id);
    const dst = removed.root.children[1];
    const next = insertNode(removed, dst.id, snapshot, 1);

    expect(next.nodesById.has(obj.id)).toBe(true);
    expect(next.nodesById.has(x.id)).toBe(true);
    expect(next.nodesById.get(obj.id)?.path).toBe("/dst/obj");
    expect(next.nodesById.get(x.id)?.path).toBe("/dst/obj/x");
    expect(toJson(next.root)).toEqual({
      src: {},
      dst: { existing: 0, obj: { x: 1 } },
    });
  });
});
