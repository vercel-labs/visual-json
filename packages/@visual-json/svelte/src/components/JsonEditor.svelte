<script lang="ts">
  import type { JsonValue, JsonSchema } from "@visual-json/core";
  import { DEFAULT_CSS_VARS } from "@internal/ui";
  import { on } from "svelte/events";
  import VisualJson from "./VisualJson.svelte";
  import TreeView from "./TreeView.svelte";
  import FormView from "./FormView.svelte";
  import SearchBar from "./SearchBar.svelte";

  interface Props {
    value?: JsonValue;
    defaultValue?: JsonValue;
    onchange?: (value: JsonValue) => void;
    schema?: JsonSchema | null;
    height?: string | number;
    width?: string | number;
    class?: string;
    style?: Record<string, string>;
    readOnly?: boolean;
    treeShowValues?: boolean;
    treeShowCounts?: boolean;
    editorShowDescriptions?: boolean;
    editorShowCounts?: boolean;
    sidebarOpen?: boolean;
  }

  let {
    value: valueProp,
    defaultValue,
    onchange,
    schema = null,
    height = "100%",
    width = "100%",
    class: className,
    style: styleProp,
    readOnly = false,
    treeShowValues = true,
    treeShowCounts = false,
    editorShowDescriptions = false,
    editorShowCounts = false,
    sidebarOpen = true,
  }: Props = $props();

  const isControlled = $derived(valueProp !== undefined);
  let currentValue = $state.raw<JsonValue>({});
  let hasInitializedUncontrolled = false;

  $effect(() => {
    if (valueProp !== undefined) {
      currentValue = valueProp;
      return;
    }
    if (!hasInitializedUncontrolled) {
      currentValue = defaultValue ?? {};
      hasInitializedUncontrolled = true;
    }
  });

  function handleChange(newValue: JsonValue) {
    currentValue = newValue;
    if (!readOnly) {
      onchange?.(newValue);
    }
  }

  // Layout state
  let sidebarWidth = $state(280);
  let isNarrow = $state(false);
  let activePanel = $state<"tree" | "form">("tree");
  let containerRef = $state<HTMLDivElement | null>(null);
  let isDragging = $state(false);
  let startX = 0;
  let startWidth = 0;
  let removeDragMoveListener: (() => void) | null = null;
  let removeDragUpListener: (() => void) | null = null;

  function checkWidth() {
    if (containerRef) {
      isNarrow = containerRef.offsetWidth < 500;
    }
  }

  $effect(() => {
    checkWidth();
    if (!containerRef) return;
    const observer = new ResizeObserver(checkWidth);
    observer.observe(containerRef);
    return () => observer.disconnect();
  });

  function stopDragging() {
    if (removeDragMoveListener) {
      removeDragMoveListener();
      removeDragMoveListener = null;
    }
    if (removeDragUpListener) {
      removeDragUpListener();
      removeDragUpListener = null;
    }
    isDragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  $effect(() => stopDragging);

  function handleMouseDown(e: MouseEvent) {
    stopDragging();
    isDragging = true;
    startX = e.clientX;
    startWidth = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging) return;
      const delta = ev.clientX - startX;
      sidebarWidth = Math.max(180, Math.min(600, startWidth + delta));
    };
    removeDragMoveListener = on(document, "mousemove", handleMouseMove);
    removeDragUpListener = on(document, "mouseup", stopDragging);
  }

  const containerStyle = $derived.by(() => {
    const h = typeof height === "number" ? `${height}px` : height;
    const w = typeof width === "number" ? `${width}px` : width;
    const vars = Object.entries(DEFAULT_CSS_VARS)
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    const extra = styleProp
      ? Object.entries(styleProp)
          .map(
            ([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`,
          )
          .join("; ")
      : "";
    return `height: ${h}; width: ${w}; display: flex; flex-direction: column; overflow: hidden; ${vars}; ${extra}`;
  });
</script>

<div data-vj-root="" class={className} style={containerStyle}>
  <style>
    @media (pointer: coarse) {
      [data-vj-root] {
        --vj-input-font-size: 16px;
      }
    }
  </style>
  <VisualJson value={currentValue} {schema} onchange={handleChange}>
    {#if isNarrow}
      <!-- Narrow layout (< 500px) -->
      <div
        bind:this={containerRef}
        style="display: flex; flex-direction: column; flex: 1; min-height: 0;"
      >
        {#if !sidebarOpen}
          <!-- No sidebar: form only -->
          <div style="flex: 1; min-height: 0;">
            <FormView
              showDescriptions={editorShowDescriptions}
              showCounts={editorShowCounts}
            />
          </div>
        {:else}
          <!-- Tabbed mode -->
          <div
            style="
								display: flex;
								flex-shrink: 0;
								border-bottom: 1px solid var(--vj-border, #333333);
								background-color: var(--vj-bg-panel, #252526);
							"
          >
            <button
              style="
									flex: 1;
									font-size: 11px;
									padding: 4px 0;
									cursor: pointer;
									font-family: var(--vj-font, monospace);
									border: none;
									background: {activePanel === 'tree'
                ? 'var(--vj-accent-muted, #094771)'
                : 'transparent'};
									color: {activePanel === 'tree'
                ? 'var(--vj-text, #cccccc)'
                : 'var(--vj-text-muted, #999999)'};
								"
              onclick={() => (activePanel = "tree")}
            >
              Tree
            </button>
            <button
              style="
									flex: 1;
									font-size: 11px;
									padding: 4px 0;
									cursor: pointer;
									font-family: var(--vj-font, monospace);
									border: none;
									background: {activePanel === 'form'
                ? 'var(--vj-accent-muted, #094771)'
                : 'transparent'};
									color: {activePanel === 'form'
                ? 'var(--vj-text, #cccccc)'
                : 'var(--vj-text-muted, #999999)'};
								"
              onclick={() => (activePanel = "form")}
            >
              Form
            </button>
          </div>
          <div style="flex: 1; min-height: 0; overflow: hidden;">
            {#if activePanel === "tree"}
              <div style="display: flex; flex-direction: column; height: 100%;">
                <SearchBar />
                <div style="flex: 1; min-height: 0; overflow: auto;">
                  <TreeView
                    showValues={treeShowValues}
                    showCounts={treeShowCounts}
                  />
                </div>
              </div>
            {:else}
              <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="flex: 1; min-height: 0;">
                  <FormView
                    showDescriptions={editorShowDescriptions}
                    showCounts={editorShowCounts}
                  />
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <!-- Wide layout -->
      <div
        bind:this={containerRef}
        style="display: flex; flex: 1; min-height: 0;"
      >
        <div
          style="
							flex-shrink: 0;
							overflow: hidden;
							display: flex;
							flex-direction: column;
							width: {sidebarOpen ? sidebarWidth + 'px' : '0'};
							transition: width 0.2s ease;
						"
        >
          <SearchBar />
          <div style="flex: 1; min-height: 0; overflow: auto;">
            <TreeView showValues={treeShowValues} showCounts={treeShowCounts} />
          </div>
        </div>

        {#if sidebarOpen}
          <div
            style="
								width: 1px;
								flex-shrink: 0;
								background-color: var(--vj-border, #333333);
								position: relative;
								transition: background-color 0.15s;
							"
          >
            <div
              aria-hidden="true"
              style="
									position: absolute;
									top: 0;
									bottom: 0;
									left: -3px;
									width: 7px;
									cursor: col-resize;
									z-index: 10;
								"
              onmousedown={handleMouseDown}
              onmouseenter={(e) => {
                const parent = (e.currentTarget as HTMLElement).parentElement;
                if (parent)
                  parent.style.backgroundColor = "var(--vj-accent, #007acc)";
              }}
              onmouseleave={(e) => {
                if (!isDragging) {
                  const parent = (e.currentTarget as HTMLElement).parentElement;
                  if (parent)
                    parent.style.backgroundColor = "var(--vj-border, #333333)";
                }
              }}
            ></div>
          </div>
        {/if}

        <div
          style="display: flex; flex-direction: column; flex: 1; min-width: 0; overflow: hidden;"
        >
          <div style="flex: 1; min-height: 0;">
            <FormView
              showDescriptions={editorShowDescriptions}
              showCounts={editorShowCounts}
            />
          </div>
        </div>
      </div>
    {/if}
  </VisualJson>
</div>
