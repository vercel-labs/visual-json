import { useRef, useEffect, useCallback } from "react";
import { useStudio } from "./context";

export interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const { state, actions } = useStudio();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          actions.prevSearchMatch();
        } else {
          actions.nextSearchMatch();
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        actions.setSearchQuery("");
        inputRef.current?.blur();
      }
    },
    [actions],
  );

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const matchCount = state.searchMatches.length;
  const currentMatch = matchCount > 0 ? state.searchMatchIndex + 1 : 0;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        backgroundColor: "var(--vj-bg, #1e1e1e)",
        borderBottom: "1px solid var(--vj-border, #333333)",
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={state.searchQuery}
        onChange={(e) => actions.setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        style={{
          flex: 1,
          background: "none",
          border: "none",
          borderRadius: 3,
          color: "var(--vj-text, #cccccc)",
          fontFamily: "var(--vj-font, monospace)",
          fontSize: "var(--vj-input-font-size, 13px)",
          padding: "3px 8px",
          outline: "none",
          minWidth: 0,
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
          height: 18,
        }}
      >
        {state.searchQuery ? (
          <>
            <span
              style={{
                fontSize: 11,
                lineHeight: 1,
                color:
                  matchCount > 0
                    ? "var(--vj-text-muted, #999999)"
                    : "var(--vj-error, #f48771)",
                fontFamily: "var(--vj-font, monospace)",
                whiteSpace: "nowrap",
              }}
            >
              {matchCount > 0 ? `${currentMatch}/${matchCount}` : "0/0"}
            </span>
            <button
              onClick={actions.prevSearchMatch}
              disabled={matchCount === 0}
              aria-label="Previous match (Shift+Enter)"
              style={{
                background: "none",
                border: "none",
                color:
                  matchCount > 0
                    ? "var(--vj-text, #cccccc)"
                    : "var(--vj-text-dimmer, #555555)",
                cursor: matchCount > 0 ? "pointer" : "default",
                padding: 0,
                fontSize: 10,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
              }}
              title="Previous match (Shift+Enter)"
            >
              &#9650;
            </button>
            <button
              onClick={actions.nextSearchMatch}
              disabled={matchCount === 0}
              aria-label="Next match (Enter)"
              style={{
                background: "none",
                border: "none",
                color:
                  matchCount > 0
                    ? "var(--vj-text, #cccccc)"
                    : "var(--vj-text-dimmer, #555555)",
                cursor: matchCount > 0 ? "pointer" : "default",
                padding: 0,
                fontSize: 10,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
              }}
              title="Next match (Enter)"
            >
              &#9660;
            </button>
            <button
              onClick={() => actions.setSearchQuery("")}
              aria-label="Clear search (Esc)"
              style={{
                background: "none",
                border: "none",
                color: "var(--vj-text, #cccccc)",
                cursor: "pointer",
                padding: 0,
                fontSize: 14,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
              }}
              title="Clear search (Esc)"
            >
              &times;
            </button>
          </>
        ) : (
          <>
            <button
              onClick={actions.expandAll}
              aria-label="Expand all"
              style={{
                background: "none",
                border: "none",
                color: "var(--vj-text-muted, #888888)",
                cursor: "pointer",
                padding: "2px",
                fontSize: 12,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
              }}
              title="Expand all"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2v4M5 4l3-2 3 2" />
                <path d="M8 14v-4M5 12l3 2 3-2" />
                <path d="M2 8h12" />
              </svg>
            </button>
            <button
              onClick={actions.collapseAll}
              aria-label="Collapse all"
              style={{
                background: "none",
                border: "none",
                color: "var(--vj-text-muted, #888888)",
                cursor: "pointer",
                padding: "2px",
                fontSize: 12,
                lineHeight: 1,
                display: "inline-flex",
                alignItems: "center",
              }}
              title="Collapse all"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 5V1M5 3l3 2 3-2" />
                <path d="M8 11v4M5 13l3-2 3 2" />
                <path d="M2 8h12" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
