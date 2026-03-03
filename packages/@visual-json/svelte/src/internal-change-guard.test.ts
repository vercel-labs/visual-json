import { describe, expect, it } from "vitest";
import { createInternalChangeGuard } from "./internal-change-guard.js";

describe("internal change guard", () => {
  it("consumes each internal token exactly once", () => {
    const guard = createInternalChangeGuard();
    const t1 = guard.markInternal();
    const t2 = guard.markInternal();

    expect(guard.shouldHandleExternalSync(t1)).toBe(false);
    expect(guard.shouldHandleExternalSync(t2)).toBe(false);
    expect(guard.shouldHandleExternalSync(t2)).toBe(true);
  });

  it("handles external sync when token was never marked internal", () => {
    const guard = createInternalChangeGuard();
    expect(guard.shouldHandleExternalSync(999)).toBe(true);
  });
});
