import type { RefObject } from "react";

interface CheckboxInputProps {
  value: boolean;
  onValueChange: (val: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function CheckboxInput({
  value,
  onValueChange,
  inputRef,
}: CheckboxInputProps) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", flex: 1 }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={value}
        onChange={(e) => onValueChange(e.target.checked ? "true" : "false")}
        onClick={(e) => e.stopPropagation()}
        style={{
          accentColor: "var(--vj-accent, #007acc)",
          cursor: "pointer",
          width: 13,
          height: 13,
        }}
      />
    </div>
  );
}
