<script lang="ts">
  import { tick } from "svelte";
  import { Portal } from "@jsrob/svelte-portal";
  import { on } from "svelte/events";

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

  interface Props {
    x: number;
    y: number;
    items: ContextMenuEntry[];
    onclose?: () => void;
  }

  let { x, y, items, onclose }: Props = $props();

  let menuRef = $state<HTMLDivElement | null>(null);
  let pos = $state({ left: 0, top: 0 });
  $effect.pre(() => {
    pos = { left: x, top: y };
  });

  async function adjustPosition() {
    await tick();
    if (!menuRef) return;
    const rect = menuRef.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    pos = {
      left: rect.right > vw ? Math.max(0, x - rect.width) : x,
      top: rect.bottom > vh ? Math.max(0, y - rect.height) : y,
    };
  }

  $effect(() => {
    // re-adjust when x/y change
    x;
    y;
    adjustPosition();
  });

  $effect(() => {
    const cleanMousedown = on(document, "mousedown", (e) => {
      if (menuRef && !menuRef.contains(e.target as Node)) {
        onclose?.();
      }
    });
    const cleanKeydown = on(document, "keydown", (e) => {
      if (e.key === "Escape") onclose?.();
    });

    return () => {
      cleanMousedown();
      cleanKeydown();
    };
  });
</script>

<Portal target="body">
  <div
    bind:this={menuRef}
    style="
			position: fixed;
			left: {pos.left}px;
			top: {pos.top}px;
			z-index: 10000;
			background-color: var(--vj-bg-panel, #252526);
			border: 1px solid var(--vj-border, #454545);
			border-radius: 4px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.5);
			padding: 4px 0;
			min-width: 160px;
		"
  >
    {#each items as item, i}
      {#if "separator" in item && item.separator}
        <div
          style="
						height: 1px;
						background-color: var(--vj-border, #454545);
						margin: 4px 0;
					"
        ></div>
      {:else if "label" in item}
        <button
          disabled={item.disabled}
          style="
						display: block;
						width: 100%;
						text-align: left;
						background: none;
						border: none;
						color: {item.disabled
            ? 'var(--vj-text-dimmer, #555555)'
            : 'var(--vj-text, #cccccc)'};
						cursor: {item.disabled ? 'default' : 'pointer'};
						padding: 4px 16px;
						font-size: 12px;
						font-family: var(--vj-font, monospace);
					"
          onclick={() => {
            if (!item.disabled) {
              item.action();
              onclose?.();
            }
          }}
          onmouseenter={(e) => {
            if (!item.disabled)
              (e.target as HTMLElement).style.backgroundColor =
                "var(--vj-accent-muted, #094771)";
          }}
          onmouseleave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = "transparent";
          }}
        >
          {item.label}
        </button>
      {/if}
    {/each}
  </div>
</Portal>
