import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type CSSProperties,
} from "react";
import type { JsonValue, JsonSchema } from "@visual-json/core";
import { VisualJson } from "./visual-json";
import { TreeView } from "./tree-view";
import { FormView } from "./form-view";
import { SearchBar } from "./search-bar";

export interface JsonEditorProps {
  value?: JsonValue;
  defaultValue?: JsonValue;
  onChange?: (value: JsonValue) => void;
  schema?: JsonSchema | null;
  height?: string | number;
  width?: string | number;
  className?: string;
  style?: CSSProperties;
  readOnly?: boolean;
  treeShowValues?: boolean;
  treeShowCounts?: boolean;
  editorShowDescriptions?: boolean;
  editorShowCounts?: boolean;
  sidebarOpen?: boolean;
}

import { DEFAULT_CSS_VARS } from "./theme";

export function JsonEditor({
  value,
  defaultValue,
  onChange,
  schema,
  height = "100%",
  width = "100%",
  className,
  style,
  readOnly,
  treeShowValues = true,
  treeShowCounts = false,
  editorShowDescriptions = false,
  editorShowCounts = false,
  sidebarOpen = true,
}: JsonEditorProps) {
  const isControlled = value !== undefined;
  const initialValue = isControlled ? value : (defaultValue ?? {});

  const [editorKey, setEditorKey] = useState(0);
  const valueRef = useRef(initialValue);

  useEffect(() => {
    if (isControlled && value !== valueRef.current) {
      valueRef.current = value;
      setEditorKey((k) => k + 1);
    }
  }, [value, isControlled]);

  const handleChange = useCallback(
    (newValue: JsonValue) => {
      valueRef.current = newValue;
      if (!readOnly) {
        onChange?.(newValue);
      }
    },
    [onChange, readOnly],
  );

  const containerStyle: CSSProperties = {
    height: typeof height === "number" ? `${height}px` : height,
    width: typeof width === "number" ? `${width}px` : width,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...(DEFAULT_CSS_VARS as unknown as CSSProperties),
    ...style,
  };

  return (
    <div className={className} data-vj-root="" style={containerStyle}>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media(pointer:coarse){[data-vj-root]{--vj-input-font-size:16px}}`,
        }}
      />
      <VisualJson
        key={editorKey}
        value={valueRef.current}
        onChange={readOnly ? undefined : handleChange}
        schema={schema}
      >
        <EditorLayout
          treeShowValues={treeShowValues}
          treeShowCounts={treeShowCounts}
          editorShowDescriptions={editorShowDescriptions}
          editorShowCounts={editorShowCounts}
          sidebarOpen={sidebarOpen}
        />
      </VisualJson>
    </div>
  );
}

function EditorLayout({
  treeShowValues,
  treeShowCounts,
  editorShowDescriptions,
  editorShowCounts,
  sidebarOpen,
}: {
  treeShowValues: boolean;
  treeShowCounts: boolean;
  editorShowDescriptions: boolean;
  editorShowCounts: boolean;
  sidebarOpen: boolean;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isNarrow, setIsNarrow] = useState(false);
  const [activePanel, setActivePanel] = useState<"tree" | "form">("tree");
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    function checkWidth() {
      if (containerRef.current) {
        setIsNarrow(containerRef.current.offsetWidth < 500);
      }
    }
    checkWidth();
    const observer = new ResizeObserver(checkWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        const newWidth = Math.max(
          180,
          Math.min(600, startWidth.current + delta),
        );
        setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [sidebarWidth],
  );

  if (isNarrow) {
    if (!sidebarOpen) {
      return (
        <div
          ref={containerRef}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div style={{ flex: 1, minHeight: 0 }}>
            <FormView
              showDescriptions={editorShowDescriptions}
              showCounts={editorShowCounts}
            />
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            borderBottom: "1px solid var(--vj-border, #333333)",
            backgroundColor: "var(--vj-bg-panel, #252526)",
          }}
        >
          <button
            onClick={() => setActivePanel("tree")}
            style={{
              flex: 1,
              fontSize: 11,
              padding: "4px 0",
              cursor: "pointer",
              fontFamily: "var(--vj-font, monospace)",
              border: "none",
              background:
                activePanel === "tree"
                  ? "var(--vj-accent-muted, #094771)"
                  : "transparent",
              color:
                activePanel === "tree"
                  ? "var(--vj-text, #cccccc)"
                  : "var(--vj-text-muted, #999999)",
            }}
          >
            Tree
          </button>
          <button
            onClick={() => setActivePanel("form")}
            style={{
              flex: 1,
              fontSize: 11,
              padding: "4px 0",
              cursor: "pointer",
              fontFamily: "var(--vj-font, monospace)",
              border: "none",
              background:
                activePanel === "form"
                  ? "var(--vj-accent-muted, #094771)"
                  : "transparent",
              color:
                activePanel === "form"
                  ? "var(--vj-text, #cccccc)"
                  : "var(--vj-text-muted, #999999)",
            }}
          >
            Form
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {activePanel === "tree" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <SearchBar />
              <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <TreeView
                  showValues={treeShowValues}
                  showCounts={treeShowCounts}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <div style={{ flex: 1, minHeight: 0 }}>
                <FormView
                  showDescriptions={editorShowDescriptions}
                  showCounts={editorShowCounts}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <div
        style={{
          flexShrink: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          width: sidebarOpen ? sidebarWidth : 0,
          transition: "width 0.2s ease",
        }}
      >
        <SearchBar />
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <TreeView showValues={treeShowValues} showCounts={treeShowCounts} />
        </div>
      </div>
      {sidebarOpen && (
        <div
          style={{
            width: 1,
            flexShrink: 0,
            backgroundColor: "var(--vj-border, #333333)",
            position: "relative",
            transition: "background-color 0.15s",
          }}
        >
          <div
            onMouseDown={handleMouseDown}
            onMouseEnter={(e) => {
              const parent = e.currentTarget.parentElement;
              if (parent)
                parent.style.backgroundColor = "var(--vj-accent, #007acc)";
            }}
            onMouseLeave={(e) => {
              if (!dragging.current) {
                const parent = e.currentTarget.parentElement;
                if (parent)
                  parent.style.backgroundColor = "var(--vj-border, #333333)";
              }
            }}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: -3,
              width: 7,
              cursor: "col-resize",
              zIndex: 10,
            }}
          />
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, minHeight: 0 }}>
          <FormView
            showDescriptions={editorShowDescriptions}
            showCounts={editorShowCounts}
          />
        </div>
      </div>
    </div>
  );
}
