# VisualJson Internal-Change Guard Design

## Context
- Current Svelte package includes `VisualJson.svelte` sync logic that distinguishes internal edits from external prop updates.
- A boolean `isInternalChange` flag can be consumed out of order when updates happen rapidly, causing unintended full-state resets.
- User was unavailable for iterative confirmations, so this design proceeds with conservative assumptions.

## Problem Statement
Prevent accidental "external reset" behavior after rapid internal updates while preserving idiomatic Svelte 5 reactivity and current editor behavior.

## Approaches Considered
1. **Keep boolean guard**  
   - Smallest code surface, but still race-prone for back-to-back internal updates.
2. **Monotonic token/counter guard (recommended)**  
   - Replace one-bit flag with incrementing internal update token and consume by value in sync effect.
   - Eliminates guard-loss race while staying lightweight and fast.
3. **Deep compare / serialization guard**  
   - Robust matching by value equality, but adds runtime cost and complexity for large JSON trees.

## Recommended Design
Use a **monotonic token-based guard** in `VisualJson.svelte`.

### Architecture
- Maintain an internal `internalChangeToken` and `consumedToken` state.
- On internal mutations (`setTree`, `undo`, `redo`), increment `internalChangeToken` before calling `onchange`.
- In external value sync `$effect`, if `consumedToken !== internalChangeToken`, consume token and skip reset path.

### Components and Data Flow
- `JsonEditor.svelte` remains simple controlled-value passthrough.
- `VisualJson.svelte` becomes the single authority for internal-vs-external classification.
- Internal edit path: user action -> tree update -> token increment -> onchange -> parent value echo -> sync effect consumes token and skips reset.
- External update path: parent prop change without new token -> sync effect rebuilds tree and resets view/search/history as intended.

### Error Handling
- No silent fallback logic; preserve current explicit behavior.
- Keep existing internal-change semantics but make them deterministic under bursty updates.

### Testing Strategy
- Add focused tests for rapid consecutive internal updates:
  - two sequential edits do not trigger external reset side effects;
  - undo/redo bursts preserve selection/history expectations;
  - genuine external prop replacement still triggers reset path.
- Run `pnpm --filter @visual-json/svelte check-types` and existing relevant test suite.

## Scope
In scope:
- `packages/@visual-json/svelte/src/components/VisualJson.svelte` guard logic
- Minimal tests covering guard behavior

Out of scope:
- API redesign
- broader state architecture refactor

## Success Criteria
- No unintended reset after rapid internal edits.
- No `state_proxy_equality_mismatch` regressions from this change.
- Existing external-reset behavior remains intact for true parent-driven value changes.
