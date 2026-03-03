import { resolveSchema } from "@visual-json/core";
import type { JsonValue, JsonSchema } from "@visual-json/core";

export interface Sample {
  name: string;
  filename: string;
  data: JsonValue;
}

export function useJsonDocument(initial: Sample) {
  let jsonValue = $state<JsonValue>(initial.data);
  let originalJson = $state<JsonValue>(structuredClone(initial.data));
  let filename = $state(initial.filename);
  let activeSample = $state(initial.filename);
  let schema = $state<JsonSchema | null>(null);
  let rawText = $state(JSON.stringify(initial.data, null, 2));
  let rawError = $state<string | null>(null);
  let parseError = $state<string | null>(null);

  function setDocument(data: JsonValue, fname: string) {
    jsonValue = data;
    originalJson = structuredClone(data);
    filename = fname;
    activeSample = fname;
    schema = null;
    rawText = JSON.stringify(data, null, 2);
    rawError = null;
    parseError = null;
  }

  // Resolve schema whenever jsonValue or filename changes
  $effect(() => {
    const val = jsonValue;
    const fname = filename;
    let cancelled = false;
    schema = null;
    resolveSchema(val as JsonValue, fname)
      .then((s: JsonSchema | null) => {
        if (!cancelled) schema = s;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  });

  function loadJson(text: string, fname: string) {
    try {
      setDocument(JSON.parse(text), fname);
    } catch {
      parseError = "Invalid JSON";
    }
  }

  function loadSample(fname: string, samples: Sample[]) {
    const sample = samples.find((s) => s.filename === fname);
    if (sample) setDocument(sample.data, fname);
  }

  function handleJsonChange(val: JsonValue) {
    jsonValue = val;
    rawText = JSON.stringify(val, null, 2);
  }

  function handleRawChange(newText: string) {
    rawText = newText;
    try {
      const parsed = JSON.parse(newText);
      rawError = null;
      jsonValue = parsed;
    } catch (e) {
      rawError = e instanceof Error ? e.message : "Invalid JSON";
    }
  }

  function clearParseError() {
    parseError = null;
  }

  return {
    get jsonValue() {
      return jsonValue;
    },
    get originalJson() {
      return originalJson;
    },
    get filename() {
      return filename;
    },
    get activeSample() {
      return activeSample;
    },
    get schema() {
      return schema;
    },
    get rawText() {
      return rawText;
    },
    get rawError() {
      return rawError;
    },
    get parseError() {
      return parseError;
    },
    loadJson,
    loadSample,
    handleJsonChange,
    handleRawChange,
    clearParseError,
  };
}
