<script lang="ts">
  import { useStudio } from "../use-studio.js";
  import { on } from "svelte/events";

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();

  const { state: studioState, actions } = useStudio();

  const MAX_SUGGESTIONS = 20;
  const DROPDOWN_MAX_HEIGHT = 200;

  let inputValue = $state("");
  let open = $state(false);
  let highlightIndex = $state(0);
  let inputRef = $state<HTMLInputElement | null>(null);
  let listRef = $state<HTMLDivElement | null>(null);
  let wrapperRef = $state<HTMLDivElement | null>(null);

  const drillDownNode = $derived(
    studioState.drillDownNodeId
      ? studioState.tree.nodesById.get(studioState.drillDownNodeId)
      : null,
  );
  const currentPath = $derived(drillDownNode?.path ?? "/");

  // Sync inputValue when currentPath changes
  $effect(() => {
    inputValue = currentPath;
  });

  const suggestions = $derived.by(() => {
    if (!open) return [];
    const query = inputValue.toLowerCase();
    const matches: { id: string; path: string }[] = [];
    for (const [id, node] of studioState.tree.nodesById) {
      if (node.path.toLowerCase().startsWith(query)) {
        matches.push({ id, path: node.path });
      }
      if (matches.length >= MAX_SUGGESTIONS) break;
    }
    matches.sort((a, b) => a.path.localeCompare(b.path));
    return matches;
  });

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

  function navigateTo(path: string) {
    for (const [id, node] of studioState.tree.nodesById) {
      if (node.path === path) {
        actions.selectAndDrillDown(id);
        break;
      }
    }
    open = false;
    inputRef?.blur();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        open = true;
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        highlightIndex = Math.min(highlightIndex + 1, suggestions.length - 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        highlightIndex = Math.max(highlightIndex - 1, 0);
        break;
      case "Enter":
        e.preventDefault();
        if (suggestions.length > 0 && highlightIndex < suggestions.length) {
          navigateTo(suggestions[highlightIndex].path);
        } else {
          navigateTo(inputValue.trim() || "/");
        }
        break;
      case "Escape":
        e.preventDefault();
        inputValue = currentPath;
        open = false;
        inputRef?.blur();
        break;
    }
  }

  function handleClickOutside(e: MouseEvent) {
    if (wrapperRef && !wrapperRef.contains(e.target as Node)) {
      inputValue = currentPath;
      open = false;
    }
  }
</script>

<div
  bind:this={wrapperRef}
  class={className}
  style="position: relative; flex: 1; min-width: 0;"
>
  <input
    bind:this={inputRef}
    value={inputValue}
    spellcheck="false"
    autocomplete="off"
    style="
			width: 100%;
			box-sizing: border-box;
			padding: 3px 0;
			font-size: var(--vj-input-font-size, 13px);
			font-family: var(--vj-font, monospace);
			color: var(--vj-text-muted, #999999);
			background: transparent;
			border: none;
			outline: none;
		"
    oninput={(e) => {
      inputValue = (e.target as HTMLInputElement).value;
      if (!open) open = true;
    }}
    onfocus={(e) => {
      (e.target as HTMLInputElement).select();
      open = true;
    }}
    onkeydown={handleKeyDown}
  />

  {#if open && suggestions.length > 0}
    <div
      bind:this={listRef}
      style="
				position: absolute;
				top: 100%;
				left: -12px;
				right: -12px;
				z-index: 50;
				max-height: {DROPDOWN_MAX_HEIGHT}px;
				overflow-y: auto;
				background-color: var(--vj-bg-panel, #252526);
				border: 1px solid var(--vj-border, #333333);
				box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			"
    >
      {#each suggestions as s, i (s.id)}
        <div
          role="option"
          aria-selected={i === highlightIndex}
          tabindex="-1"
          style="
						padding: 4px 12px;
						font-size: 13px;
						font-family: var(--vj-font, monospace);
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
            navigateTo(s.path);
          }}
          onmouseenter={() => (highlightIndex = i)}
        >
          {s.path}
        </div>
      {/each}
    </div>
  {/if}
</div>
