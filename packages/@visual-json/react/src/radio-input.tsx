import type { RefObject } from "react";

interface RadioInputProps {
  options: string[];
  value: string;
  onValueChange: (val: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function RadioInput({
  options,
  value,
  onValueChange,
  inputRef,
}: RadioInputProps) {
  return (
    <div
      style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((option, i) => (
        <label
          key={option}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            fontSize: "var(--vj-input-font-size, 13px)",
            fontFamily: "var(--vj-font, monospace)",
            color:
              value === option
                ? "var(--vj-string, #ce9178)"
                : "var(--vj-text-muted, #888888)",
            userSelect: "none",
          }}
        >
          <input
            ref={i === 0 ? inputRef : undefined}
            type="radio"
            name={`radio-group-${options.join("-")}`}
            value={option}
            checked={value === option}
            onChange={() => onValueChange(option)}
            onClick={(e) => e.stopPropagation()}
            style={{
              accentColor: "var(--vj-accent, #007acc)",
              cursor: "pointer",
              width: 13,
              height: 13,
            }}
          />
          {option}
        </label>
      ))}
    </div>
  );
}
