<script lang="ts">
  import { JsonEditor, DiffView } from "@visual-json/svelte";
  import { useJsonDocument, type Sample } from "../lib/use-json-document.svelte.js";

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
        scripts: { dev: "vite dev", build: "vite build", preview: "vite preview" },
        dependencies: { vue: "^3.5.0", vite: "^6.0.0" },
        devDependencies: { "@vitejs/plugin-vue": "^5.0.0", typescript: "^5.6.0" },
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
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
        },
        include: ["src/**/*.ts", "src/**/*.svelte"],
        exclude: ["node_modules", "dist"],
      },
    },
    {
      name: "json-render spec",
      filename: "spec.json",
      data: {
        root: "card_1",
        elements: {
          card_1: { type: "Card", props: { title: "User Profile" }, children: ["stack_1"] },
          stack_1: { type: "Stack", props: { gap: 16 }, children: ["avatar_1", "heading_1", "text_1"] },
          avatar_1: { type: "Avatar", props: { src: "https://example.com/avatar.jpg", alt: "Jane Doe" } },
          heading_1: { type: "Heading", props: { level: 2, text: "Jane Doe" } },
          text_1: { type: "Text", props: { text: "Senior Software Engineer" } },
        },
      },
    },
  ];

  const doc = useJsonDocument(samples[0]);

  let viewMode = $state<ViewMode>("tree");
  let sidebarOpen = $state(true);
  let isDragOver = $state(false);
  let pasteDialogOpen = $state(false);
  let pasteText = $state("");
  let settingsOpen = $state(false);
  let treeShowValues = $state(false);
  let treeShowCounts = $state(false);
  let editorShowDescriptions = $state(false);
  let editorShowCounts = $state(false);

  let dropZone = $state<HTMLDivElement | null>(null);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      doc.loadJson(text, "pasted.json");
    } catch {
      pasteText = "";
      pasteDialogOpen = true;
    }
  }

  function handlePasteSubmit() {
    if (pasteText.trim()) doc.loadJson(pasteText, "pasted.json");
    pasteDialogOpen = false;
    pasteText = "";
  }

  function handleDownload() {
    const text = JSON.stringify(doc.jsonValue, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(doc.jsonValue, null, 2));
    } catch {}
  }

  function handleFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") doc.loadJson(reader.result, file.name);
      };
      reader.readAsText(file);
    }
    (e.target as HTMLInputElement).value = "";
  }

  function handleDragOver(e: DragEvent) {
    if (!e.dataTransfer?.types.includes("Files")) return;
    isDragOver = true;
  }

  function handleDragLeave(e: DragEvent) {
    if (!e.dataTransfer?.types.includes("Files")) return;
    if (e.relatedTarget === null || !dropZone?.contains(e.relatedTarget as Node)) {
      isDragOver = false;
    }
  }

  function handleFileDrop(e: DragEvent) {
    isDragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") doc.loadJson(reader.result, file.name);
      };
      reader.readAsText(file);
    }
  }
</script>

<div
  bind:this={dropZone}
  role="main"
  class="flex flex-col h-full bg-[var(--bg)] text-[var(--text)]"
  ondragover={(e) => { e.preventDefault(); handleDragOver(e); }}
  ondragleave={handleDragLeave}
  ondrop={(e) => { e.preventDefault(); handleFileDrop(e); }}
>
  <!-- Drop overlay -->
  {#if isDragOver}
    <div class="absolute inset-0 z-50 flex items-center justify-center bg-[var(--drop-overlay-bg)] pointer-events-none">
      <div class="border-2 border-dashed border-[#007acc] rounded-lg px-12 py-8 text-base font-mono text-[#ccc]">
        Drop JSON file here
      </div>
    </div>
  {/if}

  <!-- Parse error -->
  {#if doc.parseError}
    <div class="error-banner">
      <span>{doc.parseError}</span>
      <button
        class="bg-transparent border-none text-inherit cursor-pointer text-4 leading-none p-0 px-0.5"
        aria-label="Dismiss error"
        onclick={doc.clearParseError}
      >
        <div class="i-lucide-x"></div>
      </button>
    </div>
  {/if}

  <!-- Toolbar -->
  <div class="flex items-center gap-1.5 px-3 h-11 bg-[var(--toolbar-bg)] border-b border-[var(--toolbar-border)] shrink-0">
    <button
      class="toolbar-btn"
      title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      onclick={() => (sidebarOpen = !sidebarOpen)}
    >
      <div class={sidebarOpen ? "i-lucide-panel-left-close" : "i-lucide-panel-left"}></div>
    </button>

    <select
      class="bg-[var(--select-bg)] border border-[var(--border)] rounded text-[var(--text)] text-xs font-inherit py-0.75 px-1.5 cursor-pointer outline-none"
      value={doc.activeSample}
      onchange={(e) => doc.loadSample((e.target as HTMLSelectElement).value, samples)}
    >
      {#each samples as s (s.filename)}
        <option value={s.filename}>{s.name}</option>
      {/each}
    </select>

    <div class="w-px h-5 bg-[var(--border)] mx-0.5"></div>

    <input
      bind:this={fileInputEl}
      type="file"
      accept=".json,.jsonc,.json5"
      class="hidden"
      onchange={handleFileInput}
    />
    <button class="toolbar-btn" title="Open file" onclick={() => fileInputEl?.click()}>
      <div class="i-lucide-folder-open"></div>
    </button>
    <button class="toolbar-btn" title="Paste JSON" onclick={handlePaste}>
      <div class="i-lucide-clipboard-paste"></div>
    </button>
    <button class="toolbar-btn" title="Download" onclick={handleDownload}>
      <div class="i-lucide-download"></div>
    </button>
    <button class="toolbar-btn" title="Copy JSON" onclick={handleCopyJson}>
      <div class="i-lucide-copy"></div>
    </button>

    <div class="flex-1"></div>

    <!-- View mode toggle -->
    <div class="flex items-center border border-[var(--border)] rounded overflow-hidden">
      {#each VIEW_MODES as m (m.id)}
        <button
          class="view-toggle-btn"
          class:active={viewMode === m.id}
          onclick={() => (viewMode = m.id)}
        >
          {m.label}
        </button>
      {/each}
    </div>

    <button class="toolbar-btn" title="Settings" onclick={() => (settingsOpen = true)}>
      <div class="i-lucide-settings"></div>
    </button>
  </div>

  <!-- Editor area -->
  <div class="flex-1 min-h-0 relative">
    {#if viewMode === "raw"}
      <div class="flex flex-col h-full bg-[var(--bg)]">
        {#if doc.rawError}
          <div class="error-banner justify-start!">{doc.rawError}</div>
        {/if}
        <textarea
          class="flex-1 w-full bg-transparent text-[var(--text)] font-mono text-13px p-4 resize-none outline-none border-none leading-relaxed"
          value={doc.rawText}
          spellcheck={false}
          oninput={(e) => doc.handleRawChange((e.target as HTMLTextAreaElement).value)}
        ></textarea>
      </div>
    {:else if viewMode === "diff"}
      <DiffView
        originalJson={doc.originalJson}
        currentJson={doc.jsonValue}
        class="h-full"
      />
    {:else}
      <JsonEditor
        value={doc.jsonValue}
        schema={doc.schema}
        treeShowValues={treeShowValues}
        treeShowCounts={treeShowCounts}
        editorShowDescriptions={editorShowDescriptions}
        editorShowCounts={editorShowCounts}
        sidebarOpen={sidebarOpen}
        height="100%"
        onchange={doc.handleJsonChange}
      />
    {/if}
  </div>

  <!-- Paste dialog -->
  {#if pasteDialogOpen}
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paste JSON" tabindex="-1"
      class="fixed inset-0 z-100 bg-black/40 flex items-center justify-center"
      onclick={(e) => { if (e.target === e.currentTarget) pasteDialogOpen = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') pasteDialogOpen = false; }}
    >
      <div class="settings-panel min-w-100">
        <h3>Paste JSON</h3>
        <textarea
          value={pasteText}
          placeholder="Paste your JSON here..."
          spellcheck={false}
          class="w-full min-h-45 bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-[var(--text)] font-mono text-13px p-2 resize-y outline-none box-border"
          oninput={(e) => (pasteText = (e.target as HTMLTextAreaElement).value)}
        ></textarea>
        <div class="flex gap-2 mt-3 justify-end">
          <button class="settings-close w-auto! py-1.5 px-4" onclick={() => (pasteDialogOpen = false)}>
            Cancel
          </button>
          <button
            class="settings-close w-auto! py-1.5 px-4 bg-[#007acc]! text-white! border-[#007acc]!"
            onclick={handlePasteSubmit}
          >
            Load
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Settings panel -->
  {#if settingsOpen}
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings" tabindex="-1"
      class="fixed inset-0 z-100 bg-black/40 flex items-center justify-center"
      onclick={(e) => { if (e.target === e.currentTarget) settingsOpen = false; }}
      onkeydown={(e) => { if (e.key === 'Escape') settingsOpen = false; }}
    >
      <div class="settings-panel">
        <h3>Settings</h3>
        <div class="mb-4">
          <h4>Tree</h4>
          <div class="settings-row">
            <span>Values</span>
            <label class="toggle">
              <input type="checkbox" bind:checked={treeShowValues} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <span>Property counts</span>
            <label class="toggle">
              <input type="checkbox" bind:checked={treeShowCounts} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="mb-4">
          <h4>Editor</h4>
          <div class="settings-row">
            <span>Descriptions</span>
            <label class="toggle">
              <input type="checkbox" bind:checked={editorShowDescriptions} />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <span>Property counts</span>
            <label class="toggle">
              <input type="checkbox" bind:checked={editorShowCounts} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <button class="settings-close" onclick={() => (settingsOpen = false)}>Close</button>
      </div>
    </div>
  {/if}
</div>
