<script setup lang="ts">
import { shallowRef, computed, watch, onMounted, onUnmounted } from "vue";
import { useStudio } from "../composables/use-studio";

defineProps<{
  class?: string;
}>();

const { state, actions } = useStudio();

const MAX_SUGGESTIONS = 20;
const DROPDOWN_MAX_HEIGHT = 200;

const drillDownNode = computed(() =>
  state.drillDownNodeId.value
    ? state.tree.value.nodesById.get(state.drillDownNodeId.value)
    : null,
);
const currentPath = computed(() => drillDownNode.value?.path ?? "/");

const inputValue = shallowRef(currentPath.value);
const open = shallowRef(false);
const highlightIndex = shallowRef(0);
const inputRef = shallowRef<HTMLInputElement | null>(null);
const listRef = shallowRef<HTMLDivElement | null>(null);
const wrapperRef = shallowRef<HTMLDivElement | null>(null);

watch(currentPath, (p) => {
  inputValue.value = p;
});

const suggestions = computed(() => {
  if (!open.value) return [];
  const query = inputValue.value.toLowerCase();
  const matches: { id: string; path: string }[] = [];
  for (const [id, node] of state.tree.value.nodesById) {
    if (node.path.toLowerCase().startsWith(query)) {
      matches.push({ id, path: node.path });
    }
    if (matches.length >= MAX_SUGGESTIONS) break;
  }
  matches.sort((a, b) => a.path.localeCompare(b.path));
  return matches;
});

watch(suggestions, () => {
  highlightIndex.value = 0;
});

watch(
  () => [highlightIndex.value, open.value] as [number, boolean],
  ([idx, isOpen]) => {
    const el = listRef.value;
    if (!el || !isOpen) return;
    const item = el.children[idx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  },
);

function navigateTo(path: string) {
  for (const [id, node] of state.tree.value.nodesById) {
    if (node.path === path) {
      actions.selectAndDrillDown(id);
      break;
    }
  }
  open.value = false;
  inputRef.value?.blur();
}

function handleKeyDown(e: KeyboardEvent) {
  if (!open.value) {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      open.value = true;
      e.preventDefault();
    }
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      highlightIndex.value = Math.min(
        highlightIndex.value + 1,
        suggestions.value.length - 1,
      );
      break;
    case "ArrowUp":
      e.preventDefault();
      highlightIndex.value = Math.max(highlightIndex.value - 1, 0);
      break;
    case "Enter":
      e.preventDefault();
      if (
        suggestions.value.length > 0 &&
        highlightIndex.value < suggestions.value.length
      ) {
        navigateTo(suggestions.value[highlightIndex.value].path);
      } else {
        navigateTo(inputValue.value.trim() || "/");
      }
      break;
    case "Escape":
      e.preventDefault();
      inputValue.value = currentPath.value;
      open.value = false;
      inputRef.value?.blur();
      break;
  }
}

function handleClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    inputValue.value = currentPath.value;
    open.value = false;
  }
}

onMounted(() => document.addEventListener("mousedown", handleClickOutside));
onUnmounted(() =>
  document.removeEventListener("mousedown", handleClickOutside),
);
</script>

<template>
  <div
    ref="wrapperRef"
    :style="{ position: 'relative', flex: 1, minWidth: 0 }"
  >
    <input
      ref="inputRef"
      :value="inputValue"
      spellcheck="false"
      autocomplete="off"
      :style="{
        width: '100%',
        boxSizing: 'border-box',
        padding: '3px 0',
        fontSize: 'var(--vj-input-font-size, 13px)',
        fontFamily: 'var(--vj-font, monospace)',
        color: 'var(--vj-text-muted, #999999)',
        background: 'transparent',
        border: 'none',
        outline: 'none',
      }"
      @input="
        (e) => {
          inputValue = (e.target as HTMLInputElement).value;
          if (!open) open = true;
        }
      "
      @focus="
        (e) => {
          (e.target as HTMLInputElement).select();
          open = true;
        }
      "
      @keydown="handleKeyDown"
    />

    <div
      v-if="open && suggestions.length > 0"
      ref="listRef"
      :style="{
        position: 'absolute',
        top: '100%',
        left: '-12px',
        right: '-12px',
        zIndex: 50,
        maxHeight: DROPDOWN_MAX_HEIGHT + 'px',
        overflowY: 'auto',
        backgroundColor: 'var(--vj-bg-panel, #252526)',
        border: '1px solid var(--vj-border, #333333)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }"
    >
      <div
        v-for="(s, i) in suggestions"
        :key="s.id"
        :style="{
          padding: '4px 12px',
          fontSize: '13px',
          fontFamily: 'var(--vj-font, monospace)',
          color:
            i === highlightIndex
              ? 'var(--vj-text, #cccccc)'
              : 'var(--vj-text-muted, #888888)',
          backgroundColor:
            i === highlightIndex ? 'var(--vj-bg-hover, #2a2d2e)' : 'transparent',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }"
        @mousedown.prevent="() => navigateTo(s.path)"
        @mouseenter="() => (highlightIndex = i)"
      >
        {{ s.path }}
      </div>
    </div>
  </div>
</template>
