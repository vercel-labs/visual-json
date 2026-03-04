<script setup lang="ts">
import { shallowRef, computed, watch, onMounted, onUnmounted } from "vue";
import type { JsonValue } from "@visual-json/core";

const props = defineProps<{
  enumValues: JsonValue[];
  value: string;
  inputStyle?: Record<string, string>;
}>();

const emit = defineEmits<{
  valueChange: [val: string];
}>();

const inputRef = defineModel<HTMLInputElement | null>("inputRef");

const DROPDOWN_MAX_HEIGHT = 200;

const inputValue = shallowRef(props.value);
const open = shallowRef(false);
const highlightIndex = shallowRef(0);
const listRef = shallowRef<HTMLDivElement | null>(null);
const wrapperRef = shallowRef<HTMLDivElement | null>(null);
const localInputRef = shallowRef<HTMLInputElement | null>(null);

watch(
  () => props.value,
  (v) => {
    inputValue.value = v;
  },
);

const suggestions = computed(() => props.enumValues.map((v) => String(v)));

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

function selectValue(val: string) {
  emit("valueChange", val);
  inputValue.value = val;
  open.value = false;
}

function handleKeyDown(e: KeyboardEvent) {
  if (!open.value) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      open.value = true;
    }
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      e.stopPropagation();
      highlightIndex.value = Math.min(
        highlightIndex.value + 1,
        suggestions.value.length - 1,
      );
      break;
    case "ArrowUp":
      e.preventDefault();
      e.stopPropagation();
      highlightIndex.value = Math.max(highlightIndex.value - 1, 0);
      break;
    case "Enter":
      e.preventDefault();
      e.stopPropagation();
      if (
        suggestions.value.length > 0 &&
        highlightIndex.value < suggestions.value.length
      ) {
        selectValue(suggestions.value[highlightIndex.value]);
      }
      break;
    case "Escape":
      e.preventDefault();
      e.stopPropagation();
      inputValue.value = props.value;
      open.value = false;
      break;
    case "Tab":
      inputValue.value = props.value;
      open.value = false;
      break;
  }
}

function handleClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    inputValue.value = props.value;
    open.value = false;
  }
}

onMounted(() => document.addEventListener("mousedown", handleClickOutside));
onUnmounted(() =>
  document.removeEventListener("mousedown", handleClickOutside),
);

defineExpose({ focus: () => localInputRef.value?.focus() });
</script>

<template>
  <div ref="wrapperRef" :style="{ position: 'relative', flex: 1, minWidth: 0 }">
    <input
      ref="localInputRef"
      :value="inputValue"
      spellcheck="false"
      autocomplete="off"
      :style="inputStyle"
      @input="
        (e) => {
          inputValue = (e.target as HTMLInputElement).value;
          if (!open) open = true;
        }
      "
      @focus="() => (open = true)"
      @keydown="handleKeyDown"
      @click.stop
    />

    <div
      v-if="open && suggestions.length > 0"
      ref="listRef"
      :style="{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: '-32px',
        right: 0,
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
        :key="s"
        :style="{
          padding: '4px 12px',
          fontSize: '13px',
          fontFamily: 'var(--vj-font, monospace)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
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
        @mousedown.prevent="() => selectValue(s)"
        @mouseenter="() => (highlightIndex = i)"
      >
        <span :style="{ width: '14px', flexShrink: 0, fontSize: '12px' }">
          {{ s === value ? "✓" : "" }}
        </span>
        {{ s }}
      </div>
    </div>
  </div>
</template>
