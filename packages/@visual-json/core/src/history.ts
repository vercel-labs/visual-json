import type { TreeState } from "./types";

const MAX_HISTORY = 100;

export class History {
  private stack: TreeState[] = [];
  private cursor = -1;

  push(state: TreeState): void {
    this.stack = this.stack.slice(0, this.cursor + 1);
    this.stack.push(state);
    if (this.stack.length > MAX_HISTORY) {
      this.stack.shift();
    } else {
      this.cursor++;
    }
  }

  undo(): TreeState | null {
    if (!this.canUndo) return null;
    this.cursor--;
    return this.stack[this.cursor];
  }

  redo(): TreeState | null {
    if (!this.canRedo) return null;
    this.cursor++;
    return this.stack[this.cursor];
  }

  get canUndo(): boolean {
    return this.cursor > 0;
  }

  get canRedo(): boolean {
    return this.cursor < this.stack.length - 1;
  }

  get current(): TreeState | null {
    return this.stack[this.cursor] ?? null;
  }
}
