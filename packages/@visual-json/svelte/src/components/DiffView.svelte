<script lang="ts">
  import { computeDiff, type DiffEntry } from "@visual-json/core";
  import { DIFF_COLORS, formatValue } from "@internal/ui";

  interface Props {
    originalJson: unknown;
    currentJson: unknown;
    class?: string;
  }

  let { originalJson, currentJson, class: className }: Props = $props();

  const entries = $derived(
    computeDiff(originalJson as never, currentJson as never),
  );
  const added = $derived(entries.filter((e) => e.type === "added").length);
  const removed = $derived(entries.filter((e) => e.type === "removed").length);
  const changed = $derived(entries.filter((e) => e.type === "changed").length);

  function getColors(entry: DiffEntry) {
    return DIFF_COLORS[entry.type];
  }
</script>

<div
  class={className}
  style="
		background-color: var(--vj-bg, #1e1e1e);
		color: var(--vj-text, #cccccc);
		overflow: auto;
		height: 100%;
		display: flex;
		flex-direction: column;
	"
>
  <div
    style="
			display: flex;
			align-items: center;
			gap: 12px;
			padding: 6px 12px;
			border-bottom: 1px solid var(--vj-border, #333333);
			background-color: var(--vj-bg-panel, #252526);
			font-family: var(--vj-font, monospace);
			font-size: 12px;
			flex-shrink: 0;
		"
  >
    <span style="color: var(--vj-text-muted, #999999);">
      {entries.length === 0 ? "No changes" : `${entries.length} changes`}
    </span>
    {#if added > 0}
      <span style="color: #4ec94e;">+{added} added</span>
    {/if}
    {#if removed > 0}
      <span style="color: #f48771;">-{removed} removed</span>
    {/if}
    {#if changed > 0}
      <span style="color: #dcdcaa;">~{changed} modified</span>
    {/if}
  </div>
  <div style="flex: 1; overflow: auto;">
    {#if entries.length === 0}
      <div
        style="
					display: flex;
					align-items: center;
					justify-content: center;
					height: 100%;
					color: var(--vj-text-dimmer, #555555);
					font-family: var(--vj-font, monospace);
					font-size: 13px;
				"
      >
        No differences detected
      </div>
    {/if}
    {#each entries as entry, i}
      <div
        style="
					display: flex;
					align-items: flex-start;
					padding: 3px 12px;
					border-bottom: 1px solid var(--vj-border-subtle, #2a2a2a);
					background-color: {getColors(entry).bg};
					font-family: var(--vj-font, monospace);
					font-size: 12px;
					gap: 8px;
				"
      >
        <span
          style="
						color: {getColors(entry).label};
						font-weight: 600;
						width: 14px;
						flex-shrink: 0;
						text-align: center;
					"
        >
          {getColors(entry).marker}
        </span>
        <span
          style="color: var(--vj-text, #cccccc); flex-shrink: 0; min-width: 100px;"
        >
          {entry.path}
        </span>
        <span style="flex: 1; display: flex; gap: 8px; overflow: hidden;">
          {#if entry.type === "changed"}
            <span style="color: #f48771; text-decoration: line-through;">
              {formatValue(entry.oldValue)}
            </span>
            <span style="color: var(--vj-text-dim, #666666);">&rarr;</span>
            <span style="color: #4ec94e;">{formatValue(entry.newValue)}</span>
          {:else if entry.type === "added"}
            <span style="color: #4ec94e;">{formatValue(entry.newValue)}</span>
          {:else if entry.type === "removed"}
            <span style="color: #f48771; text-decoration: line-through;">
              {formatValue(entry.oldValue)}
            </span>
          {/if}
        </span>
      </div>
    {/each}
  </div>
</div>
