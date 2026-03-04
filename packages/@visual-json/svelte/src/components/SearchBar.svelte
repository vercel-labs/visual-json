<script lang="ts">
  import { useStudio } from "../use-studio.js";
  import { on } from "svelte/events";

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();

  const { state: studioState, actions } = useStudio();
  let inputRef = $state<HTMLInputElement | null>(null);

  function handleKeyDown(e: KeyboardEvent) {
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
      inputRef?.blur();
    }
  }

  $effect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "f") {
        e.preventDefault();
        inputRef?.focus();
        inputRef?.select();
      }
    }
    return on(document, "keydown", handleGlobalKeyDown);
  });
</script>

<div
  class={className}
  style="
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		background-color: var(--vj-bg, #1e1e1e);
		border-bottom: 1px solid var(--vj-border, #333333);
	"
>
  <input
    bind:this={inputRef}
    type="text"
    value={studioState.searchQuery}
    placeholder="Search..."
    spellcheck="false"
    autocomplete="off"
    style="
			flex: 1;
			background: none;
			border: none;
			border-radius: 3px;
			color: var(--vj-text, #cccccc);
			font-family: var(--vj-font, monospace);
			font-size: var(--vj-input-font-size, 13px);
			padding: 3px 8px;
			outline: none;
			min-width: 0;
		"
    oninput={(e) =>
      actions.setSearchQuery((e.target as HTMLInputElement).value)}
    onkeydown={handleKeyDown}
  />
  <div
    style="
			display: flex;
			align-items: center;
			gap: 2px;
			flex-shrink: 0;
			height: 18px;
		"
  >
    {#if studioState.searchQuery}
      <span
        style="
					font-size: 11px;
					line-height: 1;
					color: {studioState.searchMatches.length > 0
          ? 'var(--vj-text-muted, #999999)'
          : 'var(--vj-error, #f48771)'};
					font-family: var(--vj-font, monospace);
					white-space: nowrap;
				"
      >
        {studioState.searchMatches.length > 0
          ? `${studioState.searchMatchIndex + 1}/${studioState.searchMatches.length}`
          : "0/0"}
      </span>
      <button
        disabled={studioState.searchMatches.length === 0}
        aria-label="Previous match (Shift+Enter)"
        title="Previous match (Shift+Enter)"
        style="
					background: none;
					border: none;
					color: {studioState.searchMatches.length > 0
          ? 'var(--vj-text, #cccccc)'
          : 'var(--vj-text-dimmer, #555555)'};
					cursor: {studioState.searchMatches.length > 0 ? 'pointer' : 'default'};
					padding: 0;
					font-size: 10px;
					line-height: 1;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 18px;
					height: 18px;
				"
        onclick={actions.prevSearchMatch}
      >
        &#9650;
      </button>
      <button
        disabled={studioState.searchMatches.length === 0}
        aria-label="Next match (Enter)"
        title="Next match (Enter)"
        style="
					background: none;
					border: none;
					color: {studioState.searchMatches.length > 0
          ? 'var(--vj-text, #cccccc)'
          : 'var(--vj-text-dimmer, #555555)'};
					cursor: {studioState.searchMatches.length > 0 ? 'pointer' : 'default'};
					padding: 0;
					font-size: 10px;
					line-height: 1;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 18px;
					height: 18px;
				"
        onclick={actions.nextSearchMatch}
      >
        &#9660;
      </button>
      <button
        aria-label="Clear search (Esc)"
        title="Clear search (Esc)"
        style="
					background: none;
					border: none;
					color: var(--vj-text, #cccccc);
					cursor: pointer;
					padding: 0;
					font-size: 14px;
					line-height: 1;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 18px;
					height: 18px;
				"
        onclick={() => actions.setSearchQuery("")}
      >
        &times;
      </button>
    {:else}
      <button
        aria-label="Expand all"
        title="Expand all"
        style="
					background: none;
					border: none;
					color: var(--vj-text-muted, #888888);
					cursor: pointer;
					padding: 2px;
					font-size: 12px;
					line-height: 1;
					display: inline-flex;
					align-items: center;
				"
        onclick={actions.expandAll}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 2v4M5 4l3-2 3 2" />
          <path d="M8 14v-4M5 12l3 2 3-2" />
          <path d="M2 8h12" />
        </svg>
      </button>
      <button
        aria-label="Collapse all"
        title="Collapse all"
        style="
					background: none;
					border: none;
					color: var(--vj-text-muted, #888888);
					cursor: pointer;
					padding: 2px;
					font-size: 12px;
					line-height: 1;
					display: inline-flex;
					align-items: center;
				"
        onclick={actions.collapseAll}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 5V1M5 3l3 2 3-2" />
          <path d="M8 11v4M5 13l3-2 3 2" />
          <path d="M2 8h12" />
        </svg>
      </button>
    {/if}
  </div>
</div>
