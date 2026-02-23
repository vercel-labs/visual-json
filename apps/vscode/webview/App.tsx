import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import type { JsonValue, JsonSchema } from "@visual-json/core";
import { JsonEditor } from "@visual-json/react";
import { parse as parseJsonc } from "jsonc-parser";
import { vscode } from "./vscode";

const VSCODE_THEME_STYLE: CSSProperties = {
  "--vj-bg": "var(--vscode-editor-background, #1e1e1e)",
  "--vj-bg-panel": "var(--vscode-sideBar-background, #252526)",
  "--vj-bg-hover": "var(--vscode-list-hoverBackground, #2a2d2e)",
  "--vj-bg-selected": "var(--vscode-list-activeSelectionBackground, #094771)",
  "--vj-bg-selected-muted":
    "var(--vscode-list-inactiveSelectionBackground, #37373d)",
  "--vj-bg-match": "var(--vscode-editor-findMatchHighlightBackground, #3a3520)",
  "--vj-bg-match-active": "var(--vscode-editor-findMatchBackground, #51502b)",
  "--vj-border": "var(--vscode-panel-border, #333333)",
  "--vj-border-subtle": "var(--vscode-widget-border, #2a2a2a)",
  "--vj-text": "var(--vscode-editor-foreground, #cccccc)",
  "--vj-text-muted": "var(--vscode-descriptionForeground, #888888)",
  "--vj-text-dim": "var(--vscode-disabledForeground, #666666)",
  "--vj-text-dimmer": "var(--vscode-disabledForeground, #555555)",
  "--vj-text-selected": "var(--vscode-list-activeSelectionForeground, #ffffff)",
  "--vj-string": "var(--vscode-debugTokenExpression-string, #ce9178)",
  "--vj-number": "var(--vscode-debugTokenExpression-number, #b5cea8)",
  "--vj-boolean": "var(--vscode-debugTokenExpression-boolean, #569cd6)",
  "--vj-accent": "var(--vscode-focusBorder, #007acc)",
  "--vj-accent-muted": "var(--vscode-list-activeSelectionBackground, #094771)",
  "--vj-input-bg": "var(--vscode-input-background, #3c3c3c)",
  "--vj-input-border": "var(--vscode-input-border, #555555)",
  "--vj-error": "var(--vscode-errorForeground, #f48771)",
  "--vj-font": "var(--vscode-editor-font-family, monospace)",
  "--vj-input-font-size": "var(--vscode-editor-font-size, 13px)",
} as CSSProperties;

type Mode = "editor" | "panel";

interface ContentMessage {
  type: "setContent";
  json: string;
  filename: string;
}

interface ModeMessage {
  type: "setMode";
  mode: Mode;
}

interface SchemaResultMessage {
  type: "schemaResult";
  schema: JsonSchema | null;
}

type HostMessage = ContentMessage | ModeMessage | SchemaResultMessage;

export function App() {
  const [jsonValue, setJsonValue] = useState<JsonValue | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [schema, setSchema] = useState<JsonSchema | null>(null);
  const [, setMode] = useState<Mode>("editor");
  const suppressEditRef = useRef(false);
  const lastJsonRef = useRef<string>("");
  const editTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent<HostMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case "setContent": {
          if (suppressEditRef.current) {
            suppressEditRef.current = false;
            return;
          }
          try {
            if (msg.json === lastJsonRef.current) return;
            lastJsonRef.current = msg.json;
            const parsed = parseJsonc(msg.json);
            setJsonValue(parsed);
            setParseError(null);

            vscode.postMessage({
              type: "requestSchema",
              json: msg.json,
              filename: msg.filename,
            });
          } catch (err) {
            setParseError(err instanceof Error ? err.message : "Invalid JSON");
          }
          break;
        }
        case "setMode":
          setMode(msg.mode);
          break;
        case "schemaResult":
          setSchema(msg.schema);
          break;
      }
    };

    window.addEventListener("message", handler);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleChange = useCallback((value: JsonValue) => {
    setJsonValue(value);
    if (editTimerRef.current !== null) clearTimeout(editTimerRef.current);
    editTimerRef.current = setTimeout(() => {
      const json = JSON.stringify(value, null, 2);
      lastJsonRef.current = json;
      suppressEditRef.current = true;
      vscode.postMessage({ type: "edit", json });
    }, 150);
  }, []);

  if (parseError) {
    return (
      <div className="visual-json-error">
        <div className="error-icon">!</div>
        <div className="error-title">Cannot parse JSON</div>
        <div className="error-message">{parseError}</div>
      </div>
    );
  }

  if (jsonValue === null) {
    return (
      <div className="visual-json-loading">
        <span>Loading JSON...</span>
      </div>
    );
  }

  return (
    <JsonEditor
      value={jsonValue}
      onChange={handleChange}
      schema={schema}
      treeShowValues={false}
      style={VSCODE_THEME_STYLE}
    />
  );
}
