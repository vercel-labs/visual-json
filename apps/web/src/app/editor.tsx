"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { JsonValue, JsonSchema } from "@visual-json/core";
import { resolveSchema } from "@visual-json/core";
import { JsonEditor } from "@visual-json/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  FolderOpen,
  ClipboardPaste,
  Download,
  Copy,
  Settings,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";

type ViewMode = "tree" | "raw";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "tree", label: "Tree" },
  { id: "raw", label: "Raw" },
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
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
      },
      dependencies: {
        next: "^15.0.0",
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
      devDependencies: {
        "@types/react": "^19.0.0",
        typescript: "^5.6.0",
        eslint: "^9.0.0",
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
        jsx: "react-jsx",
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
      include: ["src/**/*.ts", "src/**/*.tsx"],
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
          children: ["avatar_1", "heading_1", "text_1", "button_group"],
        },
        avatar_1: {
          type: "Avatar",
          props: {
            src: "https://example.com/avatar.jpg",
            alt: "Jane Doe",
            size: "lg",
          },
        },
        heading_1: { type: "Heading", props: { level: 2, text: "Jane Doe" } },
        text_1: {
          type: "Text",
          props: { text: "Senior Software Engineer at Acme Corp." },
        },
        button_group: {
          type: "ButtonGroup",
          children: ["btn_edit", "btn_share"],
        },
        btn_edit: {
          type: "Button",
          props: { label: "Edit Profile", variant: "default" },
        },
        btn_share: {
          type: "Button",
          props: { label: "Share", variant: "outline" },
        },
      },
    },
  },
  {
    name: "json-render (nested)",
    filename: "dashboard.json",
    data: {
      type: "Stack",
      props: { direction: "vertical", gap: "lg" },
      state: {
        activeTab: "overview",
        notifications: true,
        darkMode: false,
        count: 42,
      },
      children: [
        {
          type: "Stack",
          props: { direction: "horizontal", gap: "md", align: "center" },
          children: [
            { type: "Heading", props: { text: "Dashboard", level: "h1" } },
            {
              type: "Text",
              props: { text: "Manage your workspace", variant: "muted" },
            },
          ],
        },
        {
          type: "Tabs",
          props: {
            tabs: [
              { label: "Overview", value: "overview" },
              { label: "Settings", value: "settings" },
            ],
            value: { $bindState: "/activeTab" },
          },
        },
        {
          type: "Stack",
          props: { direction: "vertical", gap: "md" },
          visible: [{ $state: "/activeTab", eq: "overview" }],
          children: [
            {
              type: "Grid",
              props: { columns: 3, gap: "md" },
              children: [
                {
                  type: "Card",
                  props: { title: "Active Users" },
                  children: [
                    {
                      type: "Metric",
                      props: { label: "Users", value: 1284, change: "+12%" },
                    },
                  ],
                },
                {
                  type: "Card",
                  props: { title: "Revenue" },
                  children: [
                    {
                      type: "Metric",
                      props: {
                        label: "Revenue",
                        value: "$48,200",
                        change: "+8.2%",
                      },
                    },
                  ],
                },
                {
                  type: "Card",
                  props: { title: "Orders" },
                  children: [
                    {
                      type: "Metric",
                      props: {
                        label: "Orders",
                        value: { $state: "/count" },
                        change: "-3%",
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: "Card",
              props: { title: "Recent Activity" },
              children: [
                {
                  type: "Stack",
                  props: { direction: "vertical", gap: "sm" },
                  children: [
                    {
                      type: "Text",
                      props: {
                        text: "Alice deployed v2.4.0 to production",
                      },
                    },
                    {
                      type: "Text",
                      props: {
                        text: "Bob opened PR #312: Fix auth redirect",
                      },
                    },
                    {
                      type: "Text",
                      props: { text: "Carol added 3 new test cases" },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "Card",
          props: { title: "Preferences" },
          visible: [{ $state: "/activeTab", eq: "settings" }],
          children: [
            {
              type: "Stack",
              props: { direction: "vertical", gap: "md" },
              children: [
                {
                  type: "Switch",
                  props: {
                    label: "Email notifications",
                    checked: { $bindState: "/notifications" },
                  },
                },
                {
                  type: "Switch",
                  props: {
                    label: "Dark mode",
                    checked: { $bindState: "/darkMode" },
                  },
                },
                {
                  type: "Button",
                  props: { label: "Save preferences", variant: "primary" },
                  on: { press: { action: "confetti" } },
                },
              ],
            },
          ],
        },
      ],
    },
  },
];

export function Editor({
  defaultSidebarOpen,
}: {
  defaultSidebarOpen: boolean;
}) {
  const [activeSample, setActiveSample] = useState(samples[0].filename);
  const [jsonValue, setJsonValue] = useState<JsonValue>(samples[0].data);
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [schema, setSchema] = useState<JsonSchema | null>(null);
  const [filename, setFilename] = useState(samples[0].filename);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
  const [treeShowValues, setTreeShowValues] = useState(false);
  const [treeShowCounts, setTreeShowCounts] = useState(false);
  const [editorShowDescriptions, setEditorShowDescriptions] = useState(false);
  const [editorShowCounts, setEditorShowCounts] = useState(false);
  const [rawText, setRawText] = useState(
    JSON.stringify(samples[0].data, null, 2),
  );
  const [rawError, setRawError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipRawSync = useRef(false);

  useEffect(() => {
    let cancelled = false;
    resolveSchema(jsonValue, filename).then((s) => {
      if (!cancelled) setSchema(s);
    });
    return () => {
      cancelled = true;
    };
  }, [filename]);

  useEffect(() => {
    if (skipRawSync.current) {
      skipRawSync.current = false;
      return;
    }
    setRawText(JSON.stringify(jsonValue, null, 2));
  }, [jsonValue]);

  const loadJson = useCallback((text: string, fname: string) => {
    try {
      const parsed = JSON.parse(text);
      setJsonValue(parsed);
      setFilename(fname);
      setActiveSample(fname);
      setSchema(null);
      setRawError(null);
      setParseError(null);
    } catch {
      setParseError("Invalid JSON");
    }
  }, []);

  const handleSampleChange = useCallback((fname: string) => {
    const sample = samples.find((s) => s.filename === fname);
    if (sample) {
      setActiveSample(fname);
      setFilename(fname);
      setJsonValue(sample.data);
      setSchema(null);
      setRawError(null);
    }
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      loadJson(text, "pasted.json");
    } catch {
      setPasteText("");
      setPasteDialogOpen(true);
    }
  }, [loadJson]);

  const handlePasteSubmit = useCallback(() => {
    if (pasteText.trim()) {
      loadJson(pasteText, "pasted.json");
    }
    setPasteDialogOpen(false);
    setPasteText("");
  }, [pasteText, loadJson]);

  const handleDownload = useCallback(() => {
    const text = JSON.stringify(jsonValue, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [jsonValue, filename]);

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(jsonValue, null, 2));
    } catch {
      // clipboard access may be denied
    }
  }, [jsonValue]);

  const handleRawChange = useCallback((newText: string) => {
    setRawText(newText);
    try {
      const parsed = JSON.parse(newText);
      setRawError(null);
      skipRawSync.current = true;
      setJsonValue(parsed);
    } catch (e) {
      setRawError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }, []);

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    function handleDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      setIsDragOver(true);
    }
    function handleDragLeave(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      if (e.relatedTarget === null || !el!.contains(e.relatedTarget as Node))
        setIsDragOver(false);
    }
    function handleDrop(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string")
            loadJson(reader.result, file.name);
        };
        reader.readAsText(file);
      }
    }
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", handleDrop);
    return () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("drop", handleDrop);
    };
  }, [loadJson]);

  return (
    <div
      ref={dropRef}
      className="flex flex-col h-[calc(100vh-3.5rem)] relative"
    >
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="border-2 border-dashed border-primary rounded-lg p-8">
            <span className="text-foreground text-lg font-mono">
              Drop JSON file here
            </span>
          </div>
        </div>
      )}

      {parseError && (
        <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-b border-border shrink-0">
          <span>{parseError}</span>
          <button
            onClick={() => setParseError(null)}
            aria-label="Dismiss error"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 h-11 border-b border-border bg-background shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex h-7 w-7"
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-3.5 w-3.5" />
          ) : (
            <PanelLeft className="h-3.5 w-3.5" />
          )}
        </Button>
        <Select value={activeSample} onValueChange={handleSampleChange}>
          <SelectTrigger size="sm" className="text-xs">
            <span data-slot="select-value">
              {samples.find((s) => s.filename === activeSample)?.name ??
                samples[0].name}
            </span>
          </SelectTrigger>
          <SelectContent position="popper">
            {samples.map((s) => (
              <SelectItem key={s.filename} value={s.filename}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.jsonc,.json5"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string")
                  loadJson(reader.result, file.name);
              };
              reader.readAsText(file);
            }
            e.target.value = "";
          }}
          className="hidden"
        />
        <div className="hidden md:flex items-center gap-2">
          <div className="w-px h-5 bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => fileInputRef.current?.click()}
            title="Open file"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePaste}
            title="Paste JSON"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopyJson}
            title="Copy JSON"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => {
            if (v) setViewMode(v as ViewMode);
          }}
          variant="outline"
          size="sm"
          className="ml-auto"
        >
          {VIEW_MODES.map((m) => (
            <ToggleGroupItem key={m.id} value={m.id} className="text-xs px-3">
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Tree</h4>
                <div className="space-y-2 pl-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tree-values">Values</Label>
                    <Switch
                      id="tree-values"
                      checked={treeShowValues}
                      onCheckedChange={setTreeShowValues}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tree-counts">Property counts</Label>
                    <Switch
                      id="tree-counts"
                      checked={treeShowCounts}
                      onCheckedChange={setTreeShowCounts}
                    />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Editor</h4>
                <div className="space-y-2 pl-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="editor-descriptions">Descriptions</Label>
                    <Switch
                      id="editor-descriptions"
                      checked={editorShowDescriptions}
                      onCheckedChange={setEditorShowDescriptions}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="editor-counts">Property counts</Label>
                    <Switch
                      id="editor-counts"
                      checked={editorShowCounts}
                      onCheckedChange={setEditorShowCounts}
                    />
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        {viewMode === "raw" ? (
          <div className="flex flex-col h-full bg-background">
            {rawError && (
              <div className="px-3 py-1.5 text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-b border-border shrink-0">
                {rawError}
              </div>
            )}
            <textarea
              value={rawText}
              onChange={(e) => handleRawChange(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full bg-transparent text-foreground font-mono text-sm p-4 resize-none outline-none border-none leading-relaxed"
            />
          </div>
        ) : (
          <JsonEditor
            value={jsonValue}
            onChange={setJsonValue}
            schema={schema}
            treeShowValues={treeShowValues}
            treeShowCounts={treeShowCounts}
            editorShowDescriptions={editorShowDescriptions}
            editorShowCounts={editorShowCounts}
            sidebarOpen={sidebarOpen}
            style={
              {
                "--vj-bg": "var(--background)",
                "--vj-bg-panel": "var(--background)",
                "--vj-bg-hover": "var(--accent)",
                "--vj-bg-selected": "var(--primary)",
                "--vj-bg-selected-muted": "var(--accent)",
                "--vj-text-selected": "var(--primary-foreground)",
                "--vj-border": "var(--border)",
                "--vj-border-subtle": "var(--border)",
                "--vj-text": "var(--foreground)",
                "--vj-text-muted": "var(--muted-foreground)",
                "--vj-text-dim": "var(--muted-foreground)",
                "--vj-text-dimmer": "var(--muted-foreground)",
                "--vj-input-bg": "var(--input)",
                "--vj-input-border": "var(--border)",
                "--vj-accent": "var(--primary)",
                "--vj-accent-muted": "var(--accent)",
                "--vj-font": "var(--font-mono)",
              } as React.CSSProperties
            }
          />
        )}
      </div>

      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paste JSON</DialogTitle>
          </DialogHeader>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste your JSON here..."
            spellCheck={false}
            className="min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono resize-none outline-none"
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handlePasteSubmit}>Load</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
