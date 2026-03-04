<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted } from "vue";
import { useStudio } from "../composables/use-studio";

defineProps<{
  class?: string;
}>();

const { state, actions } = useStudio();
const inputRef = shallowRef<HTMLInputElement | null>(null);

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
    inputRef.value?.blur();
  }
}

function handleGlobalKeyDown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key === "f") {
    e.preventDefault();
    inputRef.value?.focus();
    inputRef.value?.select();
  }
}

onMounted(() => document.addEventListener("keydown", handleGlobalKeyDown));
onUnmounted(() => document.removeEventListener("keydown", handleGlobalKeyDown));
</script>

<template>
  <div
    :style="{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      backgroundColor: 'var(--vj-bg, #1e1e1e)',
      borderBottom: '1px solid var(--vj-border, #333333)',
    }"
  >
    <input
      ref="inputRef"
      type="text"
      :value="state.searchQuery.value"
      placeholder="Search..."
      spellcheck="false"
      autocomplete="off"
      :style="{
        flex: 1,
        background: 'none',
        border: 'none',
        borderRadius: '3px',
        color: 'var(--vj-text, #cccccc)',
        fontFamily: 'var(--vj-font, monospace)',
        fontSize: 'var(--vj-input-font-size, 13px)',
        padding: '3px 8px',
        outline: 'none',
        minWidth: 0,
      }"
      @input="(e) => actions.setSearchQuery((e.target as HTMLInputElement).value)"
      @keydown="handleKeyDown"
    />
    <div
      :style="{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        flexShrink: 0,
        height: '18px',
      }"
    >
      <template v-if="state.searchQuery.value">
        <span
          :style="{
            fontSize: '11px',
            lineHeight: 1,
            color:
              state.searchMatches.value.length > 0
                ? 'var(--vj-text-muted, #999999)'
                : 'var(--vj-error, #f48771)',
            fontFamily: 'var(--vj-font, monospace)',
            whiteSpace: 'nowrap',
          }"
        >
          {{
            state.searchMatches.value.length > 0
              ? `${state.searchMatchIndex.value + 1}/${state.searchMatches.value.length}`
              : "0/0"
          }}
        </span>
        <button
          :disabled="state.searchMatches.value.length === 0"
          aria-label="Previous match (Shift+Enter)"
          title="Previous match (Shift+Enter)"
          :style="{
            background: 'none',
            border: 'none',
            color:
              state.searchMatches.value.length > 0
                ? 'var(--vj-text, #cccccc)'
                : 'var(--vj-text-dimmer, #555555)',
            cursor: state.searchMatches.value.length > 0 ? 'pointer' : 'default',
            padding: 0,
            fontSize: '10px',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
          }"
          @click="actions.prevSearchMatch"
        >
          &#9650;
        </button>
        <button
          :disabled="state.searchMatches.value.length === 0"
          aria-label="Next match (Enter)"
          title="Next match (Enter)"
          :style="{
            background: 'none',
            border: 'none',
            color:
              state.searchMatches.value.length > 0
                ? 'var(--vj-text, #cccccc)'
                : 'var(--vj-text-dimmer, #555555)',
            cursor: state.searchMatches.value.length > 0 ? 'pointer' : 'default',
            padding: 0,
            fontSize: '10px',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
          }"
          @click="actions.nextSearchMatch"
        >
          &#9660;
        </button>
        <button
          aria-label="Clear search (Esc)"
          title="Clear search (Esc)"
          :style="{
            background: 'none',
            border: 'none',
            color: 'var(--vj-text, #cccccc)',
            cursor: 'pointer',
            padding: 0,
            fontSize: '14px',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
          }"
          @click="() => actions.setSearchQuery('')"
        >
          &times;
        </button>
      </template>
      <template v-else>
        <button
          aria-label="Expand all"
          title="Expand all"
          :style="{
            background: 'none',
            border: 'none',
            color: 'var(--vj-text-muted, #888888)',
            cursor: 'pointer',
            padding: '2px',
            fontSize: '12px',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
          }"
          @click="actions.expandAll"
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
          :style="{
            background: 'none',
            border: 'none',
            color: 'var(--vj-text-muted, #888888)',
            cursor: 'pointer',
            padding: '2px',
            fontSize: '12px',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
          }"
          @click="actions.collapseAll"
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
      </template>
    </div>
  </div>
</template>
