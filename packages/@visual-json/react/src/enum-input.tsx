import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type CSSProperties,
  type RefObject,
  type KeyboardEvent,
} from "react";
import type { JsonValue } from "@visual-json/core";

const DROPDOWN_MAX_HEIGHT = 200;

interface EnumInputProps {
  enumValues: JsonValue[];
  value: string;
  onValueChange: (val: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  inputStyle: CSSProperties;
}

export function EnumInput({
  enumValues,
  value,
  onValueChange,
  inputRef,
  inputStyle,
}: EnumInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const suggestions = useMemo(
    () => enumValues.map((v) => String(v)),
    [enumValues],
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [suggestions]);

  const selectValue = useCallback(
    (val: string) => {
      onValueChange(val);
      setInputValue(val);
      setOpen(false);
    },
    [onValueChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          setHighlightIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          e.stopPropagation();
          if (suggestions.length > 0 && highlightIndex < suggestions.length) {
            selectValue(suggestions[highlightIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          setInputValue(value);
          setOpen(false);
          break;
        case "Tab":
          setInputValue(value);
          setOpen(false);
          break;
      }
    },
    [open, suggestions, highlightIndex, value, selectValue],
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
        setInputValue(value);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", flex: 1, minWidth: 0 }}
    >
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        spellCheck={false}
        autoComplete="off"
        style={inputStyle}
      />

      {open && suggestions.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: -32,
            right: 0,
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
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                selectValue(s);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              style={{
                padding: "4px 12px",
                fontSize: 13,
                fontFamily: "var(--vj-font, monospace)",
                display: "flex",
                alignItems: "center",
                gap: 6,
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
              <span style={{ width: 14, flexShrink: 0, fontSize: 12 }}>
                {s === value ? "✓" : ""}
              </span>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
