import { inject } from "vue";
import { STUDIO_KEY, type StudioContextValue } from "../provide-inject";

export function useStudio(): StudioContextValue {
  const ctx = inject(STUDIO_KEY);
  if (!ctx) {
    throw new Error("useStudio must be used within a <VisualJson> provider");
  }
  return ctx;
}
