<script lang="ts">
  import { getContext, tick } from "svelte";
  import {
    setValue,
    setKey,
    addProperty,
    removeNode,
    type TreeNode,
  } from "@visual-json/core";
  import {
    getDisplayKey,
    getResolvedSchema,
    getValueColor as getValueColorFn,
    getDisplayValue as getDisplayValueFn,
    checkRequired as checkRequiredFn,
    parseInputValue,
    setMultiDragImage,
  } from "@internal/ui";
  import { useStudio } from "../use-studio.js";
  import { FORM_VIEW_KEY, type FormViewContext } from "../form-view-context.js";
  import EnumInput from "./EnumInput.svelte";
  import FormField from "./FormField.svelte";

  interface Props {
    node: TreeNode;
    depth: number;
  }

  let { node, depth }: Props = $props();

  const ctx = getContext<FormViewContext>(FORM_VIEW_KEY);
  const { state: studioState, actions } = useStudio();
  type DebugWindow = Window & { __VJ_DEBUG_EDIT__?: boolean };
  function debugEdit(event: string, details: Record<string, unknown> = {}) {
    if (typeof window === "undefined") return;
    if (!(window as DebugWindow).__VJ_DEBUG_EDIT__) return;
    console.log("[vj-edit][FormField]", event, details);
  }

  let hovered = $state(false);
  let valueInputRef = $state<EnumInput | HTMLInputElement | null>(null);
  let keyInputRef = $state<HTMLInputElement | null>(null);

  function focusValueInput() {
    if (
      valueInputRef &&
      "focus" in valueInputRef &&
      typeof valueInputRef.focus === "function"
    ) {
      valueInputRef.focus();
    }
  }

  const isContainer = $derived(node.type === "object" || node.type === "array");
  const isRoot = $derived(node.parentId === null);
  const isSelected = $derived(studioState.selectedNodeIds.has(node.id));
  const isEditing = $derived(ctx.editingNodeId === node.id);
  const collapsed = $derived(ctx.collapsedIds.has(node.id));

  const parentIsObject = $derived(
    node.parentId
      ? studioState.tree.nodesById.get(node.parentId)?.type === "object"
      : false,
  );

  const propSchema = $derived(
    getResolvedSchema(ctx.schema, ctx.rootSchema, node.path),
  );
  const isRequired = $derived(
    checkRequiredFn(node, ctx.schema, ctx.rootSchema),
  );
  const description = $derived(propSchema?.description);
  const isDeprecated = $derived(propSchema?.deprecated);
  const fieldTitle = $derived(propSchema?.title);

  const isDragTarget = $derived(ctx.dragState.dropTargetNodeId === node.id);
  const isDraggedNode = $derived(ctx.dragState.draggedNodeIds.has(node.id));

  const hasEnumValues = $derived(
    propSchema?.enum !== undefined && (propSchema.enum as unknown[]).length > 0,
  );

  const keyWidth = $derived(
    `calc(${(ctx.maxDepth - depth) * 16}px + ${ctx.maxKeyLength}ch)`,
  );

  function getBorderTopColor() {
    if (isDragTarget && ctx.dragState.dropPosition === "before")
      return "var(--vj-accent, #007acc)";
    return "transparent";
  }

  function getBorderBottomColor() {
    if (isDragTarget && ctx.dragState.dropPosition === "after")
      return "var(--vj-accent, #007acc)";
    return "transparent";
  }

  function getRowBg() {
    if (isSelected) {
      return ctx.isFocused
        ? "var(--vj-bg-selected, #2a5a1e)"
        : "var(--vj-bg-selected-muted, var(--vj-bg-hover, #2a2d2e))";
    }
    if (hovered) return "var(--vj-bg-hover, #2a2d2e)";
    return "transparent";
  }

  function getRowColor() {
    return isSelected && ctx.isFocused
      ? "var(--vj-text-selected, var(--vj-text, #cccccc))"
      : "var(--vj-text, #cccccc)";
  }

  function getValueColor(): string {
    return getValueColorFn(node);
  }

  function getDisplayValue(): string {
    return getDisplayValueFn(node);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    ctx.onDragOver(node.id, e.clientY < midY ? "before" : "after");
  }

  function handleDragStart(e: DragEvent) {
    e.dataTransfer!.effectAllowed = "move";
    if (
      studioState.selectedNodeIds.size > 1 &&
      studioState.selectedNodeIds.has(node.id)
    ) {
      setMultiDragImage(e.dataTransfer!, studioState.selectedNodeIds.size);
    }
    ctx.onDragStart(node.id);
  }

  function handleValueChange(newValue: string) {
    const parsed = parseInputValue(newValue, propSchema?.type, node.type);
    const newTree = setValue(studioState.tree, node.id, parsed);
    actions.setTree(newTree);
  }

  function handleKeyChange(newKey: string) {
    const newTree = setKey(studioState.tree, node.id, newKey);
    actions.setTree(newTree);
  }

  function handleRemove() {
    const newTree = removeNode(studioState.tree, node.id);
    actions.setTree(newTree);
  }

  function handleAddChild() {
    const key =
      node.type === "array"
        ? String(node.children.length)
        : `newKey${node.children.length}`;
    const newTree = addProperty(studioState.tree, node.id, key, "");
    actions.setTree(newTree);
  }

  // Focus appropriate input when editing starts
  $effect(() => {
    debugEdit("is-editing-changed", { nodeId: node.id, isEditing });
    if (!isEditing) return;
    tick().then(() => {
      if (!isContainer) {
        const hasValue =
          node.value !== null && node.value !== undefined && node.value !== "";
        if (hasValue && valueInputRef) {
          debugEdit("focus-value-input", { nodeId: node.id });
          focusValueInput();
        } else if (keyInputRef) {
          debugEdit("focus-key-input", { nodeId: node.id, branch: "leaf" });
          keyInputRef.focus();
        }
      } else if (keyInputRef) {
        debugEdit("focus-key-input", { nodeId: node.id, branch: "container" });
        keyInputRef.focus();
      }
    });
  });
</script>

{#if isContainer}
  <div>
    <div
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={!collapsed}
      tabindex="-1"
      data-form-node-id={node.id}
      draggable={!isRoot}
      style="
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 1px 8px;
				padding-left: {8 + depth * 16}px;
				cursor: pointer;
				background-color: {getRowBg()};
				color: {getRowColor()};
				height: 28px;
				box-sizing: border-box;
				user-select: none;
				opacity: {isDeprecated ? 0.5 : isDraggedNode ? 0.4 : 1};
				border-top: 2px solid {getBorderTopColor()};
				border-bottom: 2px solid {getBorderBottomColor()};
			"
      onclick={(e) => {
        e.stopPropagation();
        ctx.onSelect(node.id, e);
      }}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.onToggleCollapse(node.id);
        }
      }}
      ondblclick={() => ctx.onToggleCollapse(node.id)}
      onmouseenter={() => (hovered = true)}
      onmouseleave={() => (hovered = false)}
      ondragstart={handleDragStart}
      ondragover={handleDragOver}
      ondragend={() => ctx.onDragEnd()}
      ondrop={(e) => {
        e.preventDefault();
        ctx.onDrop();
      }}
    >
      <button
        style="
					background: none;
					border: none;
					color: inherit;
					cursor: pointer;
					padding: 0;
					width: 16px;
					font-size: 9px;
					flex-shrink: 0;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					transition: transform 0.15s;
					transform: {collapsed ? 'rotate(0deg)' : 'rotate(90deg)'};
				"
        onclick={(e) => {
          e.stopPropagation();
          ctx.onToggleCollapse(node.id);
        }}
      >
        &#9654;
      </button>

      {#if isEditing && !isRoot}
        <input
          bind:this={keyInputRef}
          value={node.key}
          style="
						background: none;
						border: none;
						color: inherit;
						font-family: var(--vj-font, monospace);
						font-size: var(--vj-input-font-size, 13px);
						font-weight: 500;
						padding: 0;
						outline: none;
						flex-shrink: 0;
						width: {keyWidth};
					"
          oninput={(e) => handleKeyChange((e.target as HTMLInputElement).value)}
          onclick={(e) => e.stopPropagation()}
        />
      {:else}
        <span
          style="
						color: {!isRoot && !parentIsObject && !isSelected
            ? 'var(--vj-text-muted, #888888)'
            : 'inherit'};
						font-size: var(--vj-input-font-size, 13px);
						font-family: var(--vj-font, monospace);
						font-weight: 500;
						flex-shrink: 0;
						display: inline-block;
						width: {keyWidth};
					"
        >
          {isRoot ? "/" : getDisplayKey(node, studioState.tree)}
        </span>
      {/if}

      {#if ctx.showDescriptions && fieldTitle && !isSelected}
        <span
          style="color: var(--vj-text-muted, #888888); font-size: 11px; font-family: var(--vj-font, monospace);"
        >
          {fieldTitle}
        </span>
      {/if}

      {#if hovered}
        <button
          style="
						background: none;
						border: none;
						color: {isSelected ? 'inherit' : 'var(--vj-text-muted, #888888)'};
						cursor: pointer;
						padding: 0;
						font-size: 12px;
						font-family: var(--vj-font, monospace);
					"
          onclick={(e) => {
            e.stopPropagation();
            handleAddChild();
          }}
        >
          + Add {node.type === "array" ? "item" : "property"}
        </button>
      {/if}

      {#if ctx.showCounts}
        <span
          style="
						color: {isSelected ? 'inherit' : 'var(--vj-text-dim, #666666)'};
						font-size: 12px;
						font-family: var(--vj-font, monospace);
						margin-left: auto;
					"
        >
          {node.type === "array"
            ? `${node.children.length} items`
            : `${node.children.length} properties`}
        </span>
      {/if}

      {#if !isRoot && isEditing}
        <button
          style="
						background: none;
						border: none;
						color: {isSelected ? 'inherit' : 'var(--vj-text-muted, #888888)'};
						cursor: pointer;
						padding: 2px 4px;
						font-size: 14px;
						font-family: var(--vj-font, monospace);
						{!ctx.showCounts ? 'margin-left: auto;' : ''}
					"
          title="Remove"
          onclick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
        >
          &times;
        </button>
      {/if}
    </div>

    {#if ctx.showDescriptions && description}
      <div
        style="
					padding: 2px 12px 4px;
					padding-left: {8 + depth * 16 + 22}px;
					font-size: 11px;
					color: var(--vj-text-dim, #666666);
					font-family: var(--vj-font, monospace);
				"
      >
        {description}
      </div>
    {/if}

    {#if !collapsed}
      {#each node.children as child (child.id)}
        <FormField node={child} depth={depth + 1} />
      {/each}
    {/if}
  </div>
{:else}
  <!-- Leaf node -->
  <div
    role="treeitem"
    aria-selected={isSelected}
    tabindex="-1"
    data-form-node-id={node.id}
    draggable={!isRoot}
    style="
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 1px 8px;
			padding-left: {8 + depth * 16}px;
			cursor: pointer;
			background-color: {getRowBg()};
			color: {getRowColor()};
			height: 28px;
			box-sizing: border-box;
			user-select: none;
			opacity: {isDeprecated ? 0.5 : isDraggedNode ? 0.4 : 1};
			border-top: 2px solid {getBorderTopColor()};
			border-bottom: 2px solid {getBorderBottomColor()};
		"
    onclick={(e) => {
      e.stopPropagation();
      ctx.onSelect(node.id, e);
    }}
    onkeydown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        ctx.onStartEditing(node.id);
      }
    }}
    ondblclick={() => ctx.onStartEditing(node.id)}
    onmouseenter={() => (hovered = true)}
    onmouseleave={() => (hovered = false)}
    ondragstart={handleDragStart}
    ondragover={handleDragOver}
    ondragend={() => ctx.onDragEnd()}
    ondrop={(e) => {
      e.preventDefault();
      ctx.onDrop();
    }}
  >
    <span style="width: 16px; flex-shrink: 0;"></span>

    {#if isEditing && parentIsObject}
      <input
        bind:this={keyInputRef}
        value={node.key}
        style="
					background: none;
					border: none;
					color: inherit;
					font-family: var(--vj-font, monospace);
					font-size: var(--vj-input-font-size, 13px);
					padding: 0;
					flex-shrink: 0;
					outline: none;
					width: {keyWidth};
				"
        oninput={(e) => {
          const value = (e.target as HTMLInputElement).value;
          debugEdit("key-input-change", { nodeId: node.id, value });
          handleKeyChange(value);
        }}
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => {
          if (e.key === "Tab" && !e.shiftKey && valueInputRef) {
            e.preventDefault();
            focusValueInput();
          }
        }}
      />
    {:else}
      <span
        style="
					color: {!parentIsObject && !isSelected
          ? 'var(--vj-text-muted, #888888)'
          : 'inherit'};
					font-size: var(--vj-input-font-size, 13px);
					font-family: var(--vj-font, monospace);
					flex-shrink: 0;
					display: inline-block;
					width: {keyWidth};
				"
      >
        {getDisplayKey(node, studioState.tree)}
      </span>
    {/if}

    {#if isRequired && !isSelected}
      <span
        style="color: var(--vj-error, #f48771); font-size: 10px; font-family: var(--vj-font, monospace);"
      >
        *
      </span>
    {/if}

    {#if isEditing}
      <div
        style="flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0;"
      >
        {#if node.type === "boolean"}
          <EnumInput
            bind:this={valueInputRef}
            enumValues={["true", "false"]}
            value={String(node.value)}
            inputStyle={{
              background: "none",
              border: "none",
              fontFamily: "var(--vj-font, monospace)",
              fontSize: "var(--vj-input-font-size, 13px)",
              padding: "0",
              flex: "1",
              outline: "none",
              color: getValueColor(),
            }}
            onvaluechange={(val) => {
              debugEdit("value-input-change", {
                nodeId: node.id,
                value: val,
                kind: "boolean",
              });
              handleValueChange(val);
            }}
          />
        {:else if hasEnumValues && propSchema?.enum}
          <EnumInput
            bind:this={valueInputRef}
            enumValues={propSchema.enum as import("@visual-json/core").JsonValue[]}
            value={getDisplayValue()}
            inputStyle={{
              background: "none",
              border: "none",
              fontFamily: "var(--vj-font, monospace)",
              fontSize: "var(--vj-input-font-size, 13px)",
              padding: "0",
              flex: "1",
              outline: "none",
              color: getValueColor(),
            }}
            onvaluechange={(val) => {
              debugEdit("value-input-change", {
                nodeId: node.id,
                value: val,
                kind: "enum",
              });
              handleValueChange(val);
            }}
          />
        {:else if node.type === "null"}
          <span
            style="
							color: var(--vj-boolean, #569cd6);
							font-family: var(--vj-font, monospace);
							font-size: var(--vj-input-font-size, 13px);
							font-style: italic;
							flex: 1;
						"
          >
            null
          </span>
        {:else}
          <input
            bind:this={valueInputRef}
            value={getDisplayValue()}
            placeholder={propSchema?.default !== undefined
              ? String(propSchema.default)
              : "<value>"}
            style="
							background: none;
							border: none;
							font-family: var(--vj-font, monospace);
							font-size: var(--vj-input-font-size, 13px);
							padding: 0;
							flex: 1;
							outline: none;
							color: {getValueColor()};
						"
            oninput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              debugEdit("value-input-change", {
                nodeId: node.id,
                value,
                kind: node.type,
              });
              handleValueChange(value);
            }}
            onclick={(e) => e.stopPropagation()}
          />
        {/if}
      </div>
    {:else}
      <span
        style="
					color: {getValueColor()};
					font-size: var(--vj-input-font-size, 13px);
					font-family: var(--vj-font, monospace);
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
					{node.type === 'null' ? 'font-style: italic;' : ''}
				"
      >
        {getDisplayValue()}
      </span>
    {/if}

    {#if isEditing}
      <button
        style="
					background: none;
					border: none;
					color: {isSelected ? 'inherit' : 'var(--vj-text-muted, #888888)'};
					cursor: pointer;
					padding: 2px 4px;
					font-size: 14px;
					font-family: var(--vj-font, monospace);
					flex-shrink: 0;
				"
        title="Remove"
        onclick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
      >
        &times;
      </button>
    {/if}
  </div>
{/if}
