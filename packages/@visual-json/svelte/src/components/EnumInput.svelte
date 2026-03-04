<script lang="ts">
  import { tick } from "svelte";
  import { on } from "svelte/events";
  import type { JsonValue } from "@visual-json/core";

  interface Props {
    enumValues: JsonValue[];
    value: string;
    inputStyle?: Record<string, string>;
    onvaluechange?: (val: string) => void;
  }

  let { enumValues, value, inputStyle, onvaluechange }: Props = $props();

  const DROPDOWN_MAX_HEIGHT = 200;

  const initialInputValue = (() => value)();
  let inputValue = $state(initialInputValue);
  let open = $state(false);
  let highlightIndex = $state(0);
  let listRef = $state<HTMLDivElement | null>(null);
  let wrapperRef = $state<HTMLDivElement | null>(null);
  let localInputRef = $state<HTMLInputElement | null>(null);

  $effect(() => {
    inputValue = value;
  });

  const suggestions = $derived(enumValues.map((v) => String(v)));

  $effect(() => {
    // reset highlight when suggestions change
    suggestions;
    highlightIndex = 0;
  });

  $effect(() => {
    const idx = highlightIndex;
    const isOpen = open;
    const el = listRef;
    if (!el || !isOpen) return;
    const item = el.children[idx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  });

  $effect(() => {
    return on(document, "mousedown", handleClickOutside);
  });

  function selectValue(val: string) {
    onvaluechange?.(val);
    inputValue = val;
    open = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        open = true;
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        highlightIndex = Math.min(highlightIndex + 1, suggestions.length - 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        highlightIndex = Math.max(highlightIndex - 1, 0);
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
        inputValue = value;
        open = false;
        break;
      case "Tab":
        inputValue = value;
        open = false;
        break;
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (wrapperRef && !wrapperRef.contains(e.target as Node)) {
      inputValue = value;
      open = false;
    }
  }

  export function focus() {
    localInputRef?.focus();
  }
</script>

<div bind:this={wrapperRef} style="position: relative; flex: 1; min-width: 0;">
  <input
    bind:this={localInputRef}
    value={inputValue}
    spellcheck="false"
    autocomplete="off"
    style={inputStyle
      ? Object.entries(inputStyle)
          .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`)
          .join(";")
      : ""}
    oninput={(e) => {
      inputValue = (e.target as HTMLInputElement).value;
      if (!open) open = true;
    }}
    onfocus={() => (open = true)}
    onkeydown={handleKeyDown}
    onclick={(e) => e.stopPropagation()}
  />

  {#if open && suggestions.length > 0}
    <div
      bind:this={listRef}
      style="
				position: absolute;
				top: calc(100% + 4px);
				left: -32px;
				right: 0;
				z-index: 50;
				max-height: {DROPDOWN_MAX_HEIGHT}px;
				overflow-y: auto;
				background-color: var(--vj-bg-panel, #252526);
				border: 1px solid var(--vj-border, #333333);
				box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			"
    >
      {#each suggestions as s, i (`${s}-${i}`)}
        <div
          role="option"
          aria-selected={i === highlightIndex}
          tabindex="-1"
          style="
						padding: 4px 12px;
						font-size: 13px;
						font-family: var(--vj-font, monospace);
						display: flex;
						align-items: center;
						gap: 6px;
						color: {i === highlightIndex
            ? 'var(--vj-text, #cccccc)'
            : 'var(--vj-text-muted, #888888)'};
						background-color: {i === highlightIndex
            ? 'var(--vj-bg-hover, #2a2d2e)'
            : 'transparent'};
						cursor: pointer;
						white-space: nowrap;
						overflow: hidden;
						text-overflow: ellipsis;
					"
          onmousedown={(e) => {
            e.preventDefault();
            selectValue(s);
          }}
          onmouseenter={() => (highlightIndex = i)}
        >
          <span style="width: 14px; flex-shrink: 0; font-size: 12px;">
            {s === value ? "✓" : ""}
          </span>
          {s}
        </div>
      {/each}
    </div>
  {/if}
</div>
