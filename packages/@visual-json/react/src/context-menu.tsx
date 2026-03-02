import { useEffect, useRef, useState } from "react";

export interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
  separator?: false;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      left: rect.right > vw ? Math.max(0, x - rect.width) : x,
      top: rect.bottom > vh ? Math.max(0, y - rect.height) : y,
    });
  }, [x, y]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        zIndex: 10000,
        backgroundColor: "var(--vj-bg-panel, #252526)",
        border: "1px solid var(--vj-border, #454545)",
        borderRadius: 4,
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        padding: "4px 0",
        minWidth: 160,
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div
            key={i}
            style={{
              height: 1,
              backgroundColor: "var(--vj-border, #454545)",
              margin: "4px 0",
            }}
          />
        ) : (
          <button
            key={i}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              color: item.disabled
                ? "var(--vj-text-dimmer, #555555)"
                : "var(--vj-text, #cccccc)",
              cursor: item.disabled ? "default" : "pointer",
              padding: "4px 16px",
              fontSize: 12,
              fontFamily: "var(--vj-font, monospace)",
            }}
            onMouseEnter={(e) => {
              if (!item.disabled)
                (e.target as HTMLElement).style.backgroundColor =
                  "var(--vj-accent-muted, #094771)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
