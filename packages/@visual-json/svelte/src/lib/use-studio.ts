import { getContext } from "svelte";
import { STUDIO_KEY, type StudioContextValue } from "./context.js";

export function useStudio(): StudioContextValue {
  const ctx = getContext<StudioContextValue>(STUDIO_KEY);
  if (!ctx) {
    throw new Error("useStudio must be used within a <VisualJson> provider");
  }
  return ctx;
}
