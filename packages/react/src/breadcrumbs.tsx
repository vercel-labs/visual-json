import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useStudio } from "./context";

export interface BreadcrumbsProps {
  className?: string;
}

const MAX_SUGGESTIONS = 20;
const DROPDOWN_MAX_HEIGHT = 200;

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const { state, actions } = useStudio();
  const drillDownNode = state.drillDownNodeId
    ? state.tree.nodesById.get(state.drillDownNodeId)
    : null;

  const currentPath = drillDownNode?.path ?? "/";

  const [inputValue, setInputValue] = useState(currentPath);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(currentPath);
  }, [currentPath]);

  const suggestions = useMemo(() => {
    if (!open) return [];
    const query = inputValue.toLowerCase();
    const matches: { id: string; path: string }[] = [];
    for (const [id, node] of state.tree.nodesById) {
      if (node.path.toLowerCase().startsWith(query)) {
        matches.push({ id, path: node.path });
      }
      if (matches.length >= MAX_SUGGESTIONS) break;
    }
    matches.sort((a, b) => a.path.localeCompare(b.path));
    return matches;
  }, [open, inputValue, state.tree.nodesById]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [suggestions]);

  const navigateTo = useCallback(
    (path: string) => {
      for (const [id, node] of state.tree.nodesById) {
        if (node.path === path) {
          actions.selectAndDrillDown(id);
          break;
        }
      }
      setOpen(false);
      inputRef.current?.blur();
    },
    [state.tree.nodesById, actions],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          setOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (suggestions.length > 0 && highlightIndex < suggestions.length) {
            navigateTo(suggestions[highlightIndex].path);
          } else {
            const trimmed = inputValue.trim() || "/";
            navigateTo(trimmed);
          }
          break;
        case "Escape":
          e.preventDefault();
          setInputValue(currentPath);
          setOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [open, suggestions, highlightIndex, inputValue, currentPath, navigateTo],
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el || !open) return;
    const item = el.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setInputValue(currentPath);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [currentPath]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: "relative", flex: 1, minWidth: 0 }}
    >
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoComplete="off"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "3px 0",
          fontSize: "var(--vj-input-font-size, 13px)",
          fontFamily: "var(--vj-font, monospace)",
          color: "var(--vj-text-muted, #999999)",
          background: "transparent",
          border: "none",
          outline: "none",
        }}
      />

      {open && suggestions.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            top: "100%",
            left: -12,
            right: -12,
            zIndex: 50,
            maxHeight: DROPDOWN_MAX_HEIGHT,
            overflowY: "auto",
            backgroundColor: "var(--vj-bg-panel, #252526)",
            border: "1px solid var(--vj-border, #333333)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={s.id}
              onMouseDown={(e) => {
                e.preventDefault();
                navigateTo(s.path);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              style={{
                padding: "4px 12px",
                fontSize: 13,
                fontFamily: "var(--vj-font, monospace)",
                color:
                  i === highlightIndex
                    ? "var(--vj-text, #cccccc)"
                    : "var(--vj-text-muted, #888888)",
                backgroundColor:
                  i === highlightIndex
                    ? "var(--vj-bg-hover, #2a2d2e)"
                    : "transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {s.path}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
