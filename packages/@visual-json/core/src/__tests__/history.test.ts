import { describe, it, expect, beforeEach } from "vitest";
import { History } from "../history";
import { fromJson, resetIdCounter } from "../tree";
import type { JsonValue } from "../types";

beforeEach(() => {
  resetIdCounter();
});

function makeState(value: JsonValue) {
  return fromJson(value);
}

describe("History", () => {
  it("starts with no undo/redo", () => {
    const h = new History();
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
    expect(h.current).toBe(null);
  });

  it("tracks current after push", () => {
    const h = new History();
    const s = makeState({ a: 1 });
    h.push(s);
    expect(h.current).toBe(s);
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });

  it("allows undo after two pushes", () => {
    const h = new History();
    const s1 = makeState({ a: 1 });
    const s2 = makeState({ a: 2 });
    h.push(s1);
    h.push(s2);
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);

    const result = h.undo();
    expect(result).toBe(s1);
    expect(h.current).toBe(s1);
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(true);
  });

  it("allows redo after undo", () => {
    const h = new History();
    const s1 = makeState("a");
    const s2 = makeState("b");
    h.push(s1);
    h.push(s2);
    h.undo();

    const result = h.redo();
    expect(result).toBe(s2);
    expect(h.current).toBe(s2);
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
  });

  it("returns null when undo is not available", () => {
    const h = new History();
    h.push(makeState(1));
    expect(h.undo()).toBe(null);
  });

  it("returns null when redo is not available", () => {
    const h = new History();
    h.push(makeState(1));
    expect(h.redo()).toBe(null);
  });

  it("discards redo stack on new push after undo", () => {
    const h = new History();
    const s1 = makeState(1);
    const s2 = makeState(2);
    const s3 = makeState(3);
    h.push(s1);
    h.push(s2);
    h.undo();
    h.push(s3);

    expect(h.current).toBe(s3);
    expect(h.canRedo).toBe(false);
    expect(h.canUndo).toBe(true);

    const undone = h.undo();
    expect(undone).toBe(s1);
  });

  it("supports multiple undo/redo steps", () => {
    const h = new History();
    const states = Array.from({ length: 5 }, (_, i) => makeState(i));
    for (const s of states) h.push(s);

    expect(h.current).toBe(states[4]);
    h.undo();
    h.undo();
    expect(h.current).toBe(states[2]);
    h.redo();
    expect(h.current).toBe(states[3]);
  });

  it("trims oldest entry when exceeding MAX_HISTORY", () => {
    const h = new History();
    const states = [];
    for (let i = 0; i <= 100; i++) {
      const s = makeState(i);
      states.push(s);
      h.push(s);
    }

    expect(h.current).toBe(states[100]);
    expect(h.canUndo).toBe(true);

    let undoCount = 0;
    while (h.canUndo) {
      h.undo();
      undoCount++;
    }
    // 101 pushes, but max is 100 entries, so the first was trimmed
    expect(undoCount).toBe(99);
  });

  it("maintains correct current after trimming", () => {
    const h = new History();
    for (let i = 0; i < 100; i++) {
      h.push(makeState(i));
    }
    const overflow = makeState("overflow");
    h.push(overflow);
    expect(h.current).toBe(overflow);
    expect(h.canUndo).toBe(true);
  });
});
