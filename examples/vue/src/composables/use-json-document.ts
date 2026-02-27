import { watch, onWatcherCleanup, shallowRef } from "vue";
import type { JsonValue, JsonSchema } from "@visual-json/core";
import { resolveSchema } from "@visual-json/core";

export interface Sample {
  name: string;
  filename: string;
  data: JsonValue;
}

export function useJsonDocument(initial: Sample) {
  const jsonValue = shallowRef<JsonValue>(initial.data);
  const originalJson = shallowRef<JsonValue>(structuredClone(initial.data));
  const filename = shallowRef(initial.filename);
  const activeSample = shallowRef(initial.filename);
  const schema = shallowRef<JsonSchema | null>(null);
  const rawText = shallowRef(JSON.stringify(initial.data, null, 2));
  const rawError = shallowRef<string | null>(null);
  const parseError = shallowRef<string | null>(null);

  function setDocument(data: JsonValue, fname: string) {
    jsonValue.value = data;
    originalJson.value = structuredClone(data);
    filename.value = fname;
    activeSample.value = fname;
    schema.value = null;
    rawText.value = JSON.stringify(data, null, 2);
    rawError.value = null;
    parseError.value = null;
  }

  watch(
    [jsonValue, filename],
    ([val, fname]) => {
      let cancelled = false;
      onWatcherCleanup(() => {
        cancelled = true;
      });
      schema.value = null;
      resolveSchema(val as JsonValue, fname)
        .then((s) => {
          if (!cancelled) schema.value = s;
        })
        .catch(() => {});
    },
    { immediate: true },
  );

  function loadJson(text: string, fname: string) {
    try {
      setDocument(JSON.parse(text), fname);
    } catch {
      parseError.value = "Invalid JSON";
    }
  }

  function loadSample(fname: string, samples: Sample[]) {
    const sample = samples.find((s) => s.filename === fname);
    if (sample) setDocument(sample.data, fname);
  }

  function handleJsonChange(val: JsonValue) {
    jsonValue.value = val;
    rawText.value = JSON.stringify(val, null, 2);
  }

  function handleRawChange(newText: string) {
    rawText.value = newText;
    try {
      const parsed = JSON.parse(newText);
      rawError.value = null;
      jsonValue.value = parsed;
    } catch (e) {
      rawError.value = e instanceof Error ? e.message : "Invalid JSON";
    }
  }

  return {
    jsonValue,
    originalJson,
    filename,
    activeSample,
    schema,
    rawText,
    rawError,
    parseError,
    loadJson,
    loadSample,
    handleJsonChange,
    handleRawChange,
  };
}
