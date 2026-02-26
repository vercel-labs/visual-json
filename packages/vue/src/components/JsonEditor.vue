<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, type CSSProperties } from "vue";
import type { JsonValue, JsonSchema } from "@visual-json/core";
import VisualJson from "./VisualJson.vue";
import TreeView from "./TreeView.vue";
import FormView from "./FormView.vue";
import SearchBar from "./SearchBar.vue";

const props = withDefaults(
  defineProps<{
    value?: JsonValue;
    defaultValue?: JsonValue;
    onChange?: (value: JsonValue) => void;
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
  }>(),
  {
    schema: null,
    height: "100%",
    width: "100%",
    readOnly: false,
    treeShowValues: true,
    treeShowCounts: false,
    editorShowDescriptions: false,
    editorShowCounts: false,
    sidebarOpen: true,
  },
);

const emit = defineEmits<{
  change: [value: JsonValue];
}>();

const DEFAULT_CSS_VARS: Record<string, string> = {
  "--vj-bg": "#1e1e1e",
  "--vj-bg-panel": "#252526",
  "--vj-bg-hover": "#2a2d2e",
  "--vj-bg-selected": "#2a5a1e",
  "--vj-bg-selected-muted": "#2a2d2e",
  "--vj-bg-match": "#3a3520",
  "--vj-bg-match-active": "#51502b",
  "--vj-border": "#333333",
  "--vj-border-subtle": "#2a2a2a",
  "--vj-text": "#cccccc",
  "--vj-text-muted": "#888888",
  "--vj-text-dim": "#666666",
  "--vj-text-dimmer": "#555555",
  "--vj-string": "#ce9178",
  "--vj-number": "#b5cea8",
  "--vj-boolean": "#569cd6",
  "--vj-accent": "#007acc",
  "--vj-accent-muted": "#094771",
  "--vj-input-bg": "#3c3c3c",
  "--vj-input-border": "#555555",
  "--vj-error": "#f48771",
  "--vj-font": "monospace",
  "--vj-input-font-size": "13px",
};

const isControlled = props.value !== undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const currentValue = ref<any>(
  isControlled ? props.value : (props.defaultValue ?? {}),
);
const editorKey = ref(0);

watch(
  () => props.value,
  (val) => {
    if (isControlled && val !== currentValue.value) {
      currentValue.value = val as JsonValue;
      editorKey.value++;
    }
  },
);

function handleChange(newValue: JsonValue) {
  currentValue.value = newValue;
  if (!props.readOnly) {
    emit("change", newValue);
    props.onChange?.(newValue);
  }
}

// Layout state
const sidebarWidth = ref(280);
const isNarrow = ref(false);
const activePanel = ref<"tree" | "form">("tree");
const containerRef = ref<HTMLDivElement | null>(null);
let dragging = false;
let startX = 0;
let startWidth = 0;
let observer: ResizeObserver | null = null;

function checkWidth() {
  if (containerRef.value) {
    isNarrow.value = containerRef.value.offsetWidth < 500;
  }
}

onMounted(() => {
  checkWidth();
  if (containerRef.value) {
    observer = new ResizeObserver(checkWidth);
    observer.observe(containerRef.value);
  }
});

onUnmounted(() => {
  observer?.disconnect();
});

function handleMouseDown(e: MouseEvent) {
  dragging = true;
  startX = e.clientX;
  startWidth = sidebarWidth.value;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";

  function handleMouseMove(ev: MouseEvent) {
    if (!dragging) return;
    const delta = ev.clientX - startX;
    sidebarWidth.value = Math.max(180, Math.min(600, startWidth + delta));
  }

  function handleMouseUp() {
    dragging = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

const containerStyle: CSSProperties = {
  height: typeof props.height === "number" ? `${props.height}px` : props.height,
  width: typeof props.width === "number" ? `${props.width}px` : props.width,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  ...DEFAULT_CSS_VARS,
  ...(props.style ?? {}),
};
</script>

<template>
  <div data-vj-root="" :style="containerStyle">
    <style>
      @media (pointer: coarse) {
        [data-vj-root] {
          --vj-input-font-size: 16px;
        }
      }
    </style>
    <VisualJson
      :key="editorKey"
      :value="currentValue"
      :schema="props.schema"
      @change="handleChange"
    >
      <!-- Narrow layout (< 500px) -->
      <div
        v-if="isNarrow"
        ref="containerRef"
        :style="{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }"
      >
        <!-- No sidebar mode: form only -->
        <template v-if="!props.sidebarOpen">
          <div :style="{ flex: 1, minHeight: 0 }">
            <FormView
              :show-descriptions="props.editorShowDescriptions"
              :show-counts="props.editorShowCounts"
            />
          </div>
        </template>
        <!-- Tabbed mode -->
        <template v-else>
          <div
            :style="{
              display: 'flex',
              flexShrink: 0,
              borderBottom: '1px solid var(--vj-border, #333333)',
              backgroundColor: 'var(--vj-bg-panel, #252526)',
            }"
          >
            <button
              :style="{
                flex: 1,
                fontSize: '11px',
                padding: '4px 0',
                cursor: 'pointer',
                fontFamily: 'var(--vj-font, monospace)',
                border: 'none',
                background:
                  activePanel === 'tree'
                    ? 'var(--vj-accent-muted, #094771)'
                    : 'transparent',
                color:
                  activePanel === 'tree'
                    ? 'var(--vj-text, #cccccc)'
                    : 'var(--vj-text-muted, #999999)',
              }"
              @click="() => (activePanel = 'tree')"
            >
              Tree
            </button>
            <button
              :style="{
                flex: 1,
                fontSize: '11px',
                padding: '4px 0',
                cursor: 'pointer',
                fontFamily: 'var(--vj-font, monospace)',
                border: 'none',
                background:
                  activePanel === 'form'
                    ? 'var(--vj-accent-muted, #094771)'
                    : 'transparent',
                color:
                  activePanel === 'form'
                    ? 'var(--vj-text, #cccccc)'
                    : 'var(--vj-text-muted, #999999)',
              }"
              @click="() => (activePanel = 'form')"
            >
              Form
            </button>
          </div>
          <div :style="{ flex: 1, minHeight: 0, overflow: 'hidden' }">
            <div
              v-if="activePanel === 'tree'"
              :style="{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }"
            >
              <SearchBar />
              <div :style="{ flex: 1, minHeight: 0, overflow: 'auto' }">
                <TreeView
                  :show-values="props.treeShowValues"
                  :show-counts="props.treeShowCounts"
                />
              </div>
            </div>
            <div
              v-else
              :style="{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }"
            >
              <div :style="{ flex: 1, minHeight: 0 }">
                <FormView
                  :show-descriptions="props.editorShowDescriptions"
                  :show-counts="props.editorShowCounts"
                />
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Wide layout -->
      <div
        v-else
        ref="containerRef"
        :style="{ display: 'flex', flex: 1, minHeight: 0 }"
      >
        <div
          :style="{
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            width: props.sidebarOpen ? sidebarWidth + 'px' : '0',
            transition: 'width 0.2s ease',
          }"
        >
          <SearchBar />
          <div :style="{ flex: 1, minHeight: 0, overflow: 'auto' }">
            <TreeView
              :show-values="props.treeShowValues"
              :show-counts="props.treeShowCounts"
            />
          </div>
        </div>

        <div
          v-if="props.sidebarOpen"
          :style="{
            width: '1px',
            flexShrink: 0,
            backgroundColor: 'var(--vj-border, #333333)',
            position: 'relative',
            transition: 'background-color 0.15s',
          }"
        >
          <div
            :style="{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '-3px',
              width: '7px',
              cursor: 'col-resize',
              zIndex: 10,
            }"
            @mousedown="handleMouseDown"
            @mouseenter="
              (e) => {
                const parent = (e.currentTarget as HTMLElement).parentElement;
                if (parent)
                  parent.style.backgroundColor = 'var(--vj-accent, #007acc)';
              }
            "
            @mouseleave="
              (e) => {
                if (!dragging) {
                  const parent = (e.currentTarget as HTMLElement).parentElement;
                  if (parent)
                    parent.style.backgroundColor =
                      'var(--vj-border, #333333)';
                }
              }
            "
          />
        </div>

        <div
          :style="{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
          }"
        >
          <div :style="{ flex: 1, minHeight: 0 }">
            <FormView
              :show-descriptions="props.editorShowDescriptions"
              :show-counts="props.editorShowCounts"
            />
          </div>
        </div>
      </div>
    </VisualJson>
  </div>
</template>
