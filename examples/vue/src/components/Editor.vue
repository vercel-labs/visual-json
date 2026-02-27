<script setup lang="ts">
import { reactive, useTemplateRef } from "vue";
import { JsonEditor, DiffView } from "@visual-json/vue";
import { useJsonDocument } from "../composables/use-json-document";
import type { Sample } from "../composables/use-json-document";

type ViewMode = "tree" | "raw" | "diff";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "tree", label: "Tree" },
  { id: "raw", label: "Raw" },
  { id: "diff", label: "Diff" },
];

const samples: Sample[] = [
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

const {
  jsonValue, originalJson, filename, activeSample, schema,
  rawText, rawError, parseError,
  loadJson, loadSample, handleJsonChange, handleRawChange,
} = useJsonDocument(samples[0]);

const ui = reactive({
  viewMode: "tree" as ViewMode,
  sidebarOpen: true,
  isDragOver: false,
  pasteDialogOpen: false,
  pasteText: "",
  settingsOpen: false,
  treeShowValues: false,
  treeShowCounts: false,
  editorShowDescriptions: false,
  editorShowCounts: false,
});

const dropZone = useTemplateRef<HTMLDivElement>("dropZone");
const fileInput = useTemplateRef<HTMLInputElement>("fileInput");

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    loadJson(text, "pasted.json");
  } catch {
    ui.pasteText = "";
    ui.pasteDialogOpen = true;
  }
}

function handlePasteSubmit() {
  if (ui.pasteText.trim()) {
    loadJson(ui.pasteText, "pasted.json");
  }
  ui.pasteDialogOpen = false;
  ui.pasteText = "";
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
  ui.isDragOver = true;
}

function handleDragLeave(e: DragEvent) {
  if (!e.dataTransfer?.types.includes("Files")) return;
  if (e.relatedTarget === null || !dropZone.value?.contains(e.relatedTarget as Node)) {
    ui.isDragOver = false;
  }
}

function handleFileDrop(e: DragEvent) {
  ui.isDragOver = false;
  const file = e.dataTransfer?.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") loadJson(reader.result, file.name);
    };
    reader.readAsText(file);
  }
}

</script>

<template>
  <div ref="dropZone" class="flex flex-col h-full bg-[var(--bg)] text-[var(--text)]" @dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @drop.prevent="handleFileDrop">
    <!-- Drop overlay -->
    <div v-if="ui.isDragOver" class="absolute inset-0 z-50 flex items-center justify-center bg-[var(--drop-overlay-bg)] pointer-events-none">
      <div class="border-2 border-dashed border-[#007acc] rounded-lg px-12 py-8 text-base font-mono text-[#ccc]">Drop JSON file here</div>
    </div>

    <!-- Parse error -->
    <div v-if="parseError" class="error-banner">
      <span>{{ parseError }}</span>
      <button class="bg-transparent border-none text-inherit cursor-pointer text-4 leading-none p-0 px-0.5" @click="() => (parseError = null)">
        <div class="i-lucide-x" />
      </button>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center gap-1.5 px-3 h-11 bg-[var(--toolbar-bg)] border-b border-[var(--toolbar-border)] shrink-0">
      <button
        class="toolbar-btn"
        :title="ui.sidebarOpen ? 'Hide sidebar' : 'Show sidebar'"
        @click="() => (ui.sidebarOpen = !ui.sidebarOpen)"
      >
        <div :class="ui.sidebarOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left'" />
      </button>

      <select
        class="bg-[var(--select-bg)] border border-[var(--border)] rounded text-[var(--text)] text-xs font-inherit py-0.75 px-1.5 cursor-pointer outline-none"
        :value="activeSample"
        @change="(e) => loadSample((e.target as HTMLSelectElement).value, samples)"
      >
        <option v-for="s in samples" :key="s.filename" :value="s.filename">
          {{ s.name }}
        </option>
      </select>

      <div class="w-px h-5 bg-[var(--border)] mx-0.5" />

      <input
        ref="fileInput"
        type="file"
        accept=".json,.jsonc,.json5"
        class="hidden"
        @change="handleFileInput"
      />
      <button class="toolbar-btn" title="Open file" @click="() => fileInput?.click()">
        <div class="i-lucide-folder-open" />
      </button>
      <button class="toolbar-btn" title="Paste JSON" @click="handlePaste">
        <div class="i-lucide-clipboard-paste" />
      </button>
      <button class="toolbar-btn" title="Download" @click="handleDownload">
        <div class="i-lucide-download" />
      </button>
      <button class="toolbar-btn" title="Copy JSON" @click="handleCopyJson">
        <div class="i-lucide-copy" />
      </button>

      <div class="flex-1" />

      <!-- View mode toggle -->
      <div class="flex items-center border border-[var(--border)] rounded overflow-hidden">
        <button
          v-for="m in VIEW_MODES"
          :key="m.id"
          class="view-toggle-btn"
          :class="{ active: ui.viewMode === m.id }"
          @click="() => (ui.viewMode = m.id)"
        >
          {{ m.label }}
        </button>
      </div>

      <button
        class="toolbar-btn"
        title="Settings"
        @click="() => (ui.settingsOpen = true)"
      >
        <div class="i-lucide-settings" />
      </button>
    </div>

    <!-- Editor area -->
    <div class="flex-1 min-h-0 relative">
      <!-- Raw view -->
      <div v-if="ui.viewMode === 'raw'" class="flex flex-col h-full bg-[var(--bg)]">
        <div v-if="rawError" class="error-banner justify-start!">
          {{ rawError }}
        </div>
        <textarea
          class="flex-1 w-full bg-transparent text-[var(--text)] font-mono text-13px p-4 resize-none outline-none border-none leading-relaxed"
          :value="rawText"
          spellcheck="false"
          @input="(e) => handleRawChange((e.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- Diff view -->
      <DiffView
        v-else-if="ui.viewMode === 'diff'"
        :original-json="originalJson"
        :current-json="jsonValue"
        :style="{ height: '100%' }"
      />

      <!-- Tree/form editor -->
      <JsonEditor
        v-else
        :value="jsonValue"
        :schema="schema"
        :tree-show-values="ui.treeShowValues"
        :tree-show-counts="ui.treeShowCounts"
        :editor-show-descriptions="ui.editorShowDescriptions"
        :editor-show-counts="ui.editorShowCounts"
        :sidebar-open="ui.sidebarOpen"
        :style="{ height: '100%' }"
        @change="handleJsonChange"
      />
    </div>

    <!-- Paste dialog -->
    <div
      v-if="ui.pasteDialogOpen"
      class="fixed inset-0 z-100 bg-black/40 flex items-center justify-center"
      @click.self="() => (ui.pasteDialogOpen = false)"
    >
      <div class="settings-panel min-w-100">
        <h3>Paste JSON</h3>
        <textarea
          :value="ui.pasteText"
          placeholder="Paste your JSON here..."
          spellcheck="false"
          class="w-full min-h-45 bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-[var(--text)] font-mono text-13px p-2 resize-y outline-none box-border"
          @input="(e) => (ui.pasteText = (e.target as HTMLTextAreaElement).value)"
        />
        <div class="flex gap-2 mt-3 justify-end">
          <button class="settings-close w-auto! py-1.5 px-4" @click="() => (ui.pasteDialogOpen = false)">
            Cancel
          </button>
          <button
            class="settings-close w-auto! py-1.5 px-4 bg-[#007acc]! text-white! border-[#007acc]!"
            @click="handlePasteSubmit"
          >
            Load
          </button>
        </div>
      </div>
    </div>

    <!-- Settings panel -->
    <div
      v-if="ui.settingsOpen"
      class="fixed inset-0 z-100 bg-black/40 flex items-center justify-center"
      @click.self="() => (ui.settingsOpen = false)"
    >
      <div class="settings-panel">
        <h3>Settings</h3>
        <div class="mb-4">
          <h4>Tree</h4>
          <div class="settings-row">
            <span>Values</span>
            <label class="toggle">
              <input
                type="checkbox"
                v-model="ui.treeShowValues"
              />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="settings-row">
            <span>Property counts</span>
            <label class="toggle">
              <input
                type="checkbox"
                v-model="ui.treeShowCounts"
              />
              <span class="toggle-slider" />
            </label>
          </div>
        </div>
        <div class="mb-4">
          <h4>Editor</h4>
          <div class="settings-row">
            <span>Descriptions</span>
            <label class="toggle">
              <input
                type="checkbox"
                v-model="ui.editorShowDescriptions"
              />
              <span class="toggle-slider" />
            </label>
          </div>
          <div class="settings-row">
            <span>Property counts</span>
            <label class="toggle">
              <input
                type="checkbox"
                v-model="ui.editorShowCounts"
              />
              <span class="toggle-slider" />
            </label>
          </div>
        </div>
        <button class="settings-close" @click="() => (ui.settingsOpen = false)">
          Close
        </button>
      </div>
    </div>
  </div>
</template>
