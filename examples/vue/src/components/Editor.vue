<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import type { JsonValue, JsonSchema } from "@visual-json/core";
import { resolveSchema } from "@visual-json/core";
import { JsonEditor, DiffView } from "@visual-json/vue";

type ViewMode = "tree" | "raw" | "diff";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "tree", label: "Tree" },
  { id: "raw", label: "Raw" },
  { id: "diff", label: "Diff" },
];

const samples: { name: string; filename: string; data: JsonValue }[] = [
  {
    name: "package.json",
    filename: "package.json",
    data: {
      name: "my-app",
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "vite dev",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        vue: "^3.5.0",
        vite: "^6.0.0",
      },
      devDependencies: {
        "@vitejs/plugin-vue": "^5.0.0",
        typescript: "^5.6.0",
      },
      engines: { node: ">=18" },
    },
  },
  {
    name: "tsconfig.json",
    filename: "tsconfig.json",
    data: {
      compilerOptions: {
        target: "ES2020",
        lib: ["DOM", "DOM.Iterable", "ES2020"],
        module: "ESNext",
        moduleResolution: "bundler",
        jsx: "preserve",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        baseUrl: ".",
        paths: { "@/*": ["./*"] },
      },
      include: ["src/**/*.ts", "src/**/*.vue"],
      exclude: ["node_modules", "dist"],
    },
  },
  {
    name: "json-render spec",
    filename: "spec.json",
    data: {
      root: "card_1",
      elements: {
        card_1: {
          type: "Card",
          props: { title: "User Profile" },
          children: ["stack_1"],
        },
        stack_1: {
          type: "Stack",
          props: { gap: 16 },
          children: ["avatar_1", "heading_1", "text_1"],
        },
        avatar_1: {
          type: "Avatar",
          props: { src: "https://example.com/avatar.jpg", alt: "Jane Doe" },
        },
        heading_1: { type: "Heading", props: { level: 2, text: "Jane Doe" } },
        text_1: {
          type: "Text",
          props: { text: "Senior Software Engineer" },
        },
      },
    },
  },
];

const activeSample = ref(samples[0].filename);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonValue = ref<any>(samples[0].data);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalJson = ref<any>(structuredClone(samples[0].data));
const filename = ref(samples[0].filename);
const schema = ref<JsonSchema | null>(null);
const viewMode = ref<ViewMode>("tree");
const sidebarOpen = ref(true);
const isDragOver = ref(false);
const rawText = ref(JSON.stringify(samples[0].data, null, 2));
const rawError = ref<string | null>(null);
const parseError = ref<string | null>(null);
const pasteDialogOpen = ref(false);
const pasteText = ref("");
const settingsOpen = ref(false);
const treeShowValues = ref(false);
const treeShowCounts = ref(false);
const editorShowDescriptions = ref(false);
const editorShowCounts = ref(false);

const dropRef = ref<HTMLDivElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Resolve schema when filename/value changes
let cancelSchema = false;
async function fetchSchema() {
  cancelSchema = false;
  try {
    const s = await resolveSchema(jsonValue.value, filename.value);
    if (!cancelSchema) schema.value = s;
  } catch {
    // ignore
  }
}

fetchSchema();

function loadJson(text: string, fname: string) {
  try {
    const parsed = JSON.parse(text);
    jsonValue.value = parsed;
    originalJson.value = structuredClone(parsed);
    filename.value = fname;
    activeSample.value = fname;
    schema.value = null;
    rawText.value = JSON.stringify(parsed, null, 2);
    rawError.value = null;
    parseError.value = null;
    fetchSchema();
  } catch {
    parseError.value = "Invalid JSON";
  }
}

function handleSampleChange(fname: string) {
  const sample = samples.find((s) => s.filename === fname);
  if (sample) {
    activeSample.value = fname;
    filename.value = fname;
    jsonValue.value = sample.data;
    originalJson.value = structuredClone(sample.data);
    schema.value = null;
    rawText.value = JSON.stringify(sample.data, null, 2);
    rawError.value = null;
    fetchSchema();
  }
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    loadJson(text, "pasted.json");
  } catch {
    pasteText.value = "";
    pasteDialogOpen.value = true;
  }
}

function handlePasteSubmit() {
  if (pasteText.value.trim()) {
    loadJson(pasteText.value, "pasted.json");
  }
  pasteDialogOpen.value = false;
  pasteText.value = "";
}

function handleDownload() {
  const text = JSON.stringify(jsonValue.value, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.value;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleCopyJson() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(jsonValue.value, null, 2));
  } catch {}
}

function handleRawChange(newText: string) {
  rawText.value = newText;
  try {
    const parsed = JSON.parse(newText);
    rawError.value = null;
    jsonValue.value = parsed;
  } catch (e) {
    rawError.value = e instanceof Error ? e.message : "Invalid JSON";
  }
}

function handleJsonChange(val: JsonValue) {
  jsonValue.value = val;
  rawText.value = JSON.stringify(val, null, 2);
}

function handleFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") loadJson(reader.result, file.name);
    };
    reader.readAsText(file);
  }
  (e.target as HTMLInputElement).value = "";
}

// Drag-and-drop file onto page
function handleDragOver(e: DragEvent) {
  if (!e.dataTransfer?.types.includes("Files")) return;
  e.preventDefault();
  isDragOver.value = true;
}

function handleDragLeave(e: DragEvent) {
  if (!e.dataTransfer?.types.includes("Files")) return;
  e.preventDefault();
  if (e.relatedTarget === null || !dropRef.value?.contains(e.relatedTarget as Node)) {
    isDragOver.value = false;
  }
}

function handleFileDrop(e: DragEvent) {
  if (!e.dataTransfer?.types.includes("Files")) return;
  e.preventDefault();
  isDragOver.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") loadJson(reader.result, file.name);
    };
    reader.readAsText(file);
  }
}

onMounted(() => {
  const el = dropRef.value;
  if (!el) return;
  el.addEventListener("dragover", handleDragOver);
  el.addEventListener("dragleave", handleDragLeave);
  el.addEventListener("drop", handleFileDrop);
});

onUnmounted(() => {
  cancelSchema = true;
  const el = dropRef.value;
  if (!el) return;
  el.removeEventListener("dragover", handleDragOver);
  el.removeEventListener("dragleave", handleDragLeave);
  el.removeEventListener("drop", handleFileDrop);
});
</script>

<template>
  <div ref="dropRef" class="app-shell">
    <!-- Drop overlay -->
    <div v-if="isDragOver" class="drop-overlay">
      <div class="drop-hint">Drop JSON file here</div>
    </div>

    <!-- Parse error -->
    <div v-if="parseError" class="error-banner">
      <span>{{ parseError }}</span>
      <button @click="() => (parseError = null)">&times;</button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <button
        class="toolbar-btn"
        :title="sidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
        @click="() => (sidebarOpen = !sidebarOpen)"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        >
          <rect x="1" y="2" width="14" height="12" rx="1" />
          <line x1="5" y1="2" x2="5" y2="14" />
        </svg>
      </button>

      <select
        class="toolbar-select"
        :value="activeSample"
        @change="(e) => handleSampleChange((e.target as HTMLSelectElement).value)"
      >
        <option v-for="s in samples" :key="s.filename" :value="s.filename">
          {{ s.name }}
        </option>
      </select>

      <div class="toolbar-sep" />

      <input
        ref="fileInputRef"
        type="file"
        accept=".json,.jsonc,.json5"
        class="hidden-file-input"
        @change="handleFileInput"
      />
      <button class="toolbar-btn" title="Open file" @click="() => fileInputRef?.click()">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M2 4h5l2 2h5v8H2z" />
        </svg>
      </button>
      <button class="toolbar-btn" title="Paste JSON" @click="handlePaste">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="4" y="4" width="9" height="11" rx="1" />
          <path d="M4 4V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" />
          <line x1="6" y1="8" x2="11" y2="8" />
          <line x1="6" y1="11" x2="11" y2="11" />
        </svg>
      </button>
      <button class="toolbar-btn" title="Download" @click="handleDownload">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 2v8M5 7l3 3 3-3" />
          <path d="M3 13h10" />
        </svg>
      </button>
      <button class="toolbar-btn" title="Copy JSON" @click="handleCopyJson">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="5" y="5" width="9" height="9" rx="1" />
          <path d="M3 10V3a1 1 0 0 1 1-1h7" />
        </svg>
      </button>

      <div class="toolbar-spacer" />

      <!-- View mode toggle -->
      <div class="view-toggle">
        <button
          v-for="m in VIEW_MODES"
          :key="m.id"
          class="view-toggle-btn"
          :class="{ active: viewMode === m.id }"
          @click="() => (viewMode = m.id)"
        >
          {{ m.label }}
        </button>
      </div>

      <button
        class="toolbar-btn"
        title="Settings"
        @click="() => (settingsOpen = true)"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="8" cy="8" r="2" />
          <path
            d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
          />
        </svg>
      </button>
    </div>

    <!-- Editor area -->
    <div class="editor-area">
      <!-- Raw view -->
      <div v-if="viewMode === 'raw'" class="raw-editor">
        <div v-if="rawError" class="error-banner" style="justify-content: flex-start">
          {{ rawError }}
        </div>
        <textarea
          class="raw-textarea"
          :value="rawText"
          spellcheck="false"
          @input="(e) => handleRawChange((e.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- Diff view -->
      <DiffView
        v-else-if="viewMode === 'diff'"
        :original-json="originalJson"
        :current-json="jsonValue"
        :style="{ height: '100%' }"
      />

      <!-- Tree/form editor -->
      <JsonEditor
        v-else
        :value="jsonValue"
        :schema="schema"
        :tree-show-values="treeShowValues"
        :tree-show-counts="treeShowCounts"
        :editor-show-descriptions="editorShowDescriptions"
        :editor-show-counts="editorShowCounts"
        :sidebar-open="sidebarOpen"
        :style="{ height: '100%' }"
        @change="handleJsonChange"
      />
    </div>

    <!-- Paste dialog -->
    <div
      v-if="pasteDialogOpen"
      class="settings-backdrop"
      @click.self="() => (pasteDialogOpen = false)"
    >
      <div class="settings-panel" style="min-width: 400px">
        <h3>Paste JSON</h3>
        <textarea
          :value="pasteText"
          placeholder="Paste your JSON here..."
          spellcheck="false"
          style="
            width: 100%;
            min-height: 180px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 4px;
            color: var(--text);
            font-family: monospace;
            font-size: 13px;
            padding: 8px;
            resize: vertical;
            outline: none;
            box-sizing: border-box;
          "
          @input="(e) => (pasteText = (e.target as HTMLTextAreaElement).value)"
        />
        <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end">
          <button class="settings-close" style="width: auto; padding: 6px 16px" @click="() => (pasteDialogOpen = false)">
            Cancel
          </button>
          <button
            class="settings-close"
            style="width: auto; padding: 6px 16px; background: #007acc; color: white; border-color: #007acc"
            @click="handlePasteSubmit"
          >
            Load
          </button>
        </div>
      </div>
    </div>

    <!-- Settings panel -->
    <div
      v-if="settingsOpen"
      class="settings-backdrop"
      @click.self="() => (settingsOpen = false)"
    >
      <div class="settings-panel">
        <h3>Settings</h3>
        <div class="settings-group">
          <h4>Tree</h4>
          <div class="settings-row">
            <span>Values</span>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="treeShowValues"
                @change="(e) => (treeShowValues = (e.target as HTMLInputElement).checked)"
              />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="settings-row">
            <span>Property counts</span>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="treeShowCounts"
                @change="(e) => (treeShowCounts = (e.target as HTMLInputElement).checked)"
              />
              <span class="toggle-slider" />
            </label>
          </div>
        </div>
        <div class="settings-group">
          <h4>Editor</h4>
          <div class="settings-row">
            <span>Descriptions</span>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="editorShowDescriptions"
                @change="
                  (e) =>
                    (editorShowDescriptions = (e.target as HTMLInputElement).checked)
                "
              />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="settings-row">
            <span>Property counts</span>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="editorShowCounts"
                @change="
                  (e) => (editorShowCounts = (e.target as HTMLInputElement).checked)
                "
              />
              <span class="toggle-slider" />
            </label>
          </div>
        </div>
        <button class="settings-close" @click="() => (settingsOpen = false)">
          Close
        </button>
      </div>
    </div>
  </div>
</template>
