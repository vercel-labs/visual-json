import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  setValue,
  setKey,
  addProperty,
  removeNode,
  getPropertySchema,
  resolveRef,
  type TreeNode,
  type JsonSchemaProperty,
  type JsonSchema,
} from "@visual-json/core";
import { useStudio } from "./context";
import { Breadcrumbs } from "./breadcrumbs";
import { EnumInput } from "./enum-input";
import { getDisplayKey } from "./display-key";
import { getVisibleNodes } from "./get-visible-nodes";
import { useDragDrop, type DragState } from "./use-drag-drop";

interface FormFieldProps {
  node: TreeNode;
  schema: JsonSchema | null;
  rootSchema: JsonSchemaProperty | undefined;
  depth: number;
  showDescriptions: boolean;
  showCounts: boolean;
  formSelectedNodeId: string | null;
  editingNodeId: string | null;
  collapsedIds: Set<string>;
  maxKeyLength: number;
  maxDepth: number;
  isFocused: boolean;
  dragState: DragState;
  onSelect: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onStartEditing: (nodeId: string) => void;
  onDragStart: (nodeId: string) => void;
  onDragOver: (nodeId: string, position: "before" | "after") => void;
  onDragEnd: () => void;
  onDrop: () => void;
}

function getResolvedSchema(
  schema: JsonSchema | null,
  rootSchema: JsonSchemaProperty | undefined,
  path: string,
): JsonSchemaProperty | undefined {
  if (!schema) return undefined;
  const raw = getPropertySchema(schema, path, rootSchema);
  if (!raw) return undefined;
  return resolveRef(raw, rootSchema ?? schema);
}

function getValueColor(node: TreeNode): string {
  if (node.type === "boolean" || node.type === "null")
    return "var(--vj-boolean, #569cd6)";
  if (node.type === "number") return "var(--vj-number, #b5cea8)";
  return "var(--vj-string, #ce9178)";
}

function getDisplayValue(node: TreeNode): string {
  if (node.type === "null") return "null";
  if (node.type === "boolean") return String(node.value);
  if (node.value === null || node.value === undefined) return "";
  return String(node.value);
}

function FormField({
  node,
  schema,
  rootSchema,
  depth,
  showDescriptions,
  showCounts,
  formSelectedNodeId,
  editingNodeId,
  collapsedIds,
  maxKeyLength,
  maxDepth,
  isFocused,
  dragState,
  onSelect,
  onToggleCollapse,
  onStartEditing,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: FormFieldProps) {
  const { state, actions } = useStudio();
  const isContainer = node.type === "object" || node.type === "array";
  const collapsed = collapsedIds.has(node.id);
  const isSelected = formSelectedNodeId === node.id;
  const isEditing = editingNodeId === node.id;
  const propSchema = getResolvedSchema(schema, rootSchema, node.path);
  const isRequired = checkRequired(node, schema, rootSchema);
  const [hovered, setHovered] = useState(false);

  const isRoot = node.parentId === null;
  const isDragTarget = dragState.dropTargetNodeId === node.id;
  const isDraggedNode = dragState.draggedNodeId === node.id;

  function handleDragOverEvent(e: React.DragEvent) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    onDragOver(node.id, e.clientY < midY ? "before" : "after");
  }

  let borderTop = "none";
  let borderBottom = "none";
  if (isDragTarget && dragState.dropPosition === "before") {
    borderTop = "2px solid var(--vj-accent, #007acc)";
  } else if (isDragTarget && dragState.dropPosition === "after") {
    borderBottom = "2px solid var(--vj-accent, #007acc)";
  }

  const valueRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    if (!isContainer) {
      const hasValue =
        node.value !== null && node.value !== undefined && node.value !== "";
      if (hasValue && valueRef.current) {
        valueRef.current.focus();
      } else if (keyRef.current) {
        keyRef.current.focus();
      }
    } else if (keyRef.current) {
      keyRef.current.focus();
    }
  }, [isEditing, isContainer, node.value]);

  const handleValueChange = useCallback(
    (newValue: string) => {
      let parsed: string | number | boolean | null;
      if (
        propSchema?.type === "boolean" ||
        newValue === "true" ||
        newValue === "false"
      ) {
        parsed = newValue === "true";
      } else if (newValue === "null") {
        parsed = null;
      } else if (
        propSchema?.type === "number" ||
        propSchema?.type === "integer" ||
        node.type === "number"
      ) {
        const num = Number(newValue);
        parsed = isNaN(num) ? newValue : num;
      } else {
        parsed = newValue;
      }
      const newTree = setValue(state.tree, node.id, parsed);
      actions.setTree(newTree);
    },
    [state.tree, node.id, node.type, actions, propSchema],
  );

  const handleKeyChange = useCallback(
    (newKey: string) => {
      const newTree = setKey(state.tree, node.id, newKey);
      actions.setTree(newTree);
    },
    [state.tree, node.id, actions],
  );

  const handleRemove = useCallback(() => {
    const newTree = removeNode(state.tree, node.id);
    actions.setTree(newTree);
  }, [state.tree, node.id, actions]);

  const handleAddChild = useCallback(() => {
    const key =
      node.type === "array"
        ? String(node.children.length)
        : `newKey${node.children.length}`;
    const newTree = addProperty(state.tree, node.id, key, "");
    actions.setTree(newTree);
  }, [state.tree, node.id, node.type, node.children.length, actions]);

  const description = propSchema?.description;
  const isDeprecated = propSchema?.deprecated;
  const fieldTitle = propSchema?.title;
  const parentIsObject =
    node.parentId && state.tree.nodesById.get(node.parentId)?.type === "object";

  const rowBg = isSelected
    ? isFocused
      ? "var(--vj-bg-selected, #2a5a1e)"
      : "var(--vj-bg-selected-muted, var(--vj-bg-hover, #2a2d2e))"
    : hovered
      ? "var(--vj-bg-hover, #2a2d2e)"
      : "transparent";

  const rowColor =
    isSelected && isFocused
      ? "var(--vj-text-selected, var(--vj-text, #cccccc))"
      : "var(--vj-text, #cccccc)";

  if (isContainer) {
    return (
      <div>
        <div
          data-form-node-id={node.id}
          draggable={!isRoot}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            onDragStart(node.id);
          }}
          onDragOver={handleDragOverEvent}
          onDragEnd={onDragEnd}
          onDrop={(e) => {
            e.preventDefault();
            onDrop();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 8px",
            paddingLeft: 8 + depth * 16,
            cursor: "pointer",
            backgroundColor: rowBg,
            color: rowColor,
            height: 28,
            userSelect: "none",
            opacity: isDeprecated ? 0.5 : isDraggedNode ? 0.4 : 1,
            borderTop,
            borderBottom,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          onDoubleClick={() => onToggleCollapse(node.id)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(node.id);
            }}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 0,
              width: 16,
              fontSize: 9,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.15s",
              transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
            }}
          >
            &#9654;
          </button>
          {isEditing && !isRoot ? (
            <input
              ref={keyRef}
              value={node.key}
              onChange={(e) => handleKeyChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                fontFamily: "var(--vj-font, monospace)",
                fontSize: "var(--vj-input-font-size, 13px)",
                fontWeight: 500,
                padding: 0,
                outline: "none",
                flexShrink: 0,
                width: `calc(${(maxDepth - depth) * 16}px + ${maxKeyLength}ch)`,
              }}
            />
          ) : (
            <span
              style={{
                color:
                  !isRoot && !parentIsObject && !isSelected
                    ? "var(--vj-text-muted, #888888)"
                    : "inherit",
                fontSize: 13,
                fontFamily: "var(--vj-font, monospace)",
                fontWeight: 500,
                flexShrink: 0,
                display: "inline-block",
                width: `calc(${(maxDepth - depth) * 16}px + ${maxKeyLength}ch)`,
              }}
            >
              {isRoot ? "/" : getDisplayKey(node, state.tree)}
            </span>
          )}
          {showDescriptions && fieldTitle && !isSelected && (
            <span
              style={{
                color: "var(--vj-text-muted, #888888)",
                fontSize: 11,
                fontFamily: "var(--vj-font, monospace)",
              }}
            >
              {fieldTitle}
            </span>
          )}
          {hovered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddChild();
              }}
              style={{
                background: "none",
                border: "none",
                color: isSelected ? "inherit" : "var(--vj-text-muted, #888888)",
                cursor: "pointer",
                padding: 0,
                fontSize: 12,
                fontFamily: "var(--vj-font, monospace)",
              }}
            >
              + Add {node.type === "array" ? "item" : "property"}
            </button>
          )}
          {showCounts && (
            <span
              style={{
                color: isSelected ? "inherit" : "var(--vj-text-dim, #666666)",
                fontSize: 12,
                fontFamily: "var(--vj-font, monospace)",
                marginLeft: "auto",
              }}
            >
              {node.type === "array"
                ? `${node.children.length} items`
                : `${node.children.length} properties`}
            </span>
          )}
          {!isRoot && isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              style={{
                background: "none",
                border: "none",
                color: isSelected ? "inherit" : "var(--vj-text-muted, #888888)",
                cursor: "pointer",
                padding: "2px 4px",
                fontSize: 14,
                fontFamily: "var(--vj-font, monospace)",
                ...(!showCounts ? { marginLeft: "auto" } : {}),
              }}
              title="Remove"
            >
              &times;
            </button>
          )}
        </div>
        {showDescriptions && description && (
          <div
            style={{
              padding: "2px 12px 4px",
              paddingLeft: 8 + depth * 16 + 22,
              fontSize: 11,
              color: "var(--vj-text-dim, #666666)",
              fontFamily: "var(--vj-font, monospace)",
            }}
          >
            {description}
          </div>
        )}
        {!collapsed && (
          <div>
            {node.children.map((child) => (
              <FormField
                key={child.id}
                node={child}
                schema={schema}
                rootSchema={rootSchema}
                depth={depth + 1}
                showDescriptions={showDescriptions}
                showCounts={showCounts}
                formSelectedNodeId={formSelectedNodeId}
                editingNodeId={editingNodeId}
                collapsedIds={collapsedIds}
                maxKeyLength={maxKeyLength}
                maxDepth={maxDepth}
                isFocused={isFocused}
                dragState={dragState}
                onSelect={onSelect}
                onToggleCollapse={onToggleCollapse}
                onStartEditing={onStartEditing}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                onDrop={onDrop}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const displayValue = getDisplayValue(node);
  const valueColor = getValueColor(node);

  return (
    <div
      data-form-node-id={node.id}
      draggable={!isRoot}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(node.id);
      }}
      onDragOver={handleDragOverEvent}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        paddingLeft: 8 + depth * 16,
        cursor: "pointer",
        backgroundColor: rowBg,
        color: rowColor,
        height: 28,
        userSelect: "none",
        opacity: isDeprecated ? 0.5 : isDraggedNode ? 0.4 : 1,
        borderTop,
        borderBottom,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onDoubleClick={() => onStartEditing(node.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ width: 16, flexShrink: 0 }} />
      {isEditing && parentIsObject ? (
        <input
          ref={keyRef}
          value={node.key}
          onChange={(e) => handleKeyChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Tab" && !e.shiftKey && valueRef.current) {
              e.preventDefault();
              valueRef.current.focus();
            }
          }}
          style={{
            background: "none",
            border: "none",
            color: "inherit",
            fontFamily: "var(--vj-font, monospace)",
            fontSize: "var(--vj-input-font-size, 13px)",
            padding: 0,
            flexShrink: 0,
            outline: "none",
            width: `calc(${(maxDepth - depth) * 16}px + ${maxKeyLength}ch)`,
          }}
        />
      ) : (
        <span
          style={{
            color:
              !parentIsObject && !isSelected
                ? "var(--vj-text-muted, #888888)"
                : "inherit",
            fontSize: 13,
            fontFamily: "var(--vj-font, monospace)",
            flexShrink: 0,
            display: "inline-block",
            width: `calc(${(maxDepth - depth) * 16}px + ${maxKeyLength}ch)`,
          }}
        >
          {getDisplayKey(node, state.tree)}
        </span>
      )}
      {isRequired && !isSelected && (
        <span
          style={{
            color: "var(--vj-error, #f48771)",
            fontSize: 10,
            fontFamily: "var(--vj-font, monospace)",
          }}
        >
          *
        </span>
      )}
      {isEditing ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
          {renderEditInput(
            node,
            propSchema,
            displayValue,
            handleValueChange,
            valueRef as React.RefObject<HTMLInputElement | HTMLSelectElement>,
            valueColor,
          )}
        </div>
      ) : (
        <span
          style={{
            color: valueColor,
            fontSize: 13,
            fontFamily: "var(--vj-font, monospace)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontStyle: node.type === "null" ? "italic" : undefined,
          }}
        >
          {displayValue}
        </span>
      )}
      {isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          style={{
            background: "none",
            border: "none",
            color: isSelected ? "inherit" : "var(--vj-text-muted, #888888)",
            cursor: "pointer",
            padding: "2px 4px",
            fontSize: 14,
            fontFamily: "var(--vj-font, monospace)",
            flexShrink: 0,
          }}
          title="Remove"
        >
          &times;
        </button>
      )}
    </div>
  );
}

function renderEditInput(
  node: TreeNode,
  propSchema: JsonSchemaProperty | undefined,
  displayValue: string,
  handleValueChange: (val: string) => void,
  inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement>,
  valueColor: string,
) {
  const hasEnumValues = propSchema?.enum && propSchema.enum.length > 0;

  const inputStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    fontFamily: "var(--vj-font, monospace)",
    fontSize: "var(--vj-input-font-size, 13px)",
    padding: 0,
    flex: 1,
    outline: "none",
    color: valueColor,
  };

  if (node.type === "boolean") {
    return (
      <EnumInput
        enumValues={["true", "false"]}
        value={String(node.value)}
        onValueChange={handleValueChange}
        inputRef={inputRef as React.RefObject<HTMLInputElement>}
        inputStyle={inputStyle}
      />
    );
  }

  if (hasEnumValues && propSchema?.enum) {
    return (
      <EnumInput
        enumValues={propSchema.enum}
        value={displayValue}
        onValueChange={handleValueChange}
        inputRef={inputRef as React.RefObject<HTMLInputElement>}
        inputStyle={inputStyle}
      />
    );
  }

  if (node.type === "null") {
    return (
      <span
        style={{
          color: "var(--vj-boolean, #569cd6)",
          fontFamily: "var(--vj-font, monospace)",
          fontSize: 13,
          fontStyle: "italic",
          flex: 1,
        }}
      >
        null
      </span>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      value={displayValue}
      onChange={(e) => handleValueChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder={
        propSchema?.default !== undefined
          ? String(propSchema.default)
          : "<value>"
      }
      style={inputStyle}
    />
  );
}

function checkRequired(
  node: TreeNode,
  schema: JsonSchema | null,
  rootSchema: JsonSchemaProperty | undefined,
): boolean {
  if (!schema || !node.parentId) return false;
  const parentPath = node.path.split("/").slice(0, -1).join("/") || "/";
  const parentSchema = getResolvedSchema(schema, rootSchema, parentPath);
  return parentSchema?.required?.includes(node.key) ?? false;
}

export interface FormViewProps {
  className?: string;
  showDescriptions?: boolean;
  showCounts?: boolean;
}

export function FormView({
  className,
  showDescriptions = false,
  showCounts = false,
}: FormViewProps) {
  const { state, actions } = useStudio();
  const rootSchema = state.schema ?? undefined;
  const selectedNode = state.selectedNodeId
    ? state.tree.nodesById.get(state.selectedNodeId)
    : null;
  const displayNode = selectedNode ?? state.tree.root;

  const [formSelectedNodeId, setFormSelectedNodeId] = useState<string | null>(
    null,
  );
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const preEditTreeRef = useRef<typeof state.tree | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  } = useDragDrop();

  useEffect(() => {
    setFormSelectedNodeId(null);
    setEditingNodeId(null);
    setCollapsedIds(new Set<string>());
  }, [displayNode.id]);

  const visibleNodes = useMemo(
    () => getVisibleNodes(displayNode, (id) => !collapsedIds.has(id)),
    [displayNode, collapsedIds],
  );

  const { maxKeyLength, maxDepth } = useMemo(() => {
    let maxKey = 1;
    let maxD = 0;
    const baseSegments =
      displayNode.path === "/"
        ? 0
        : displayNode.path.split("/").filter(Boolean).length;
    for (const node of visibleNodes) {
      const keyText =
        node.parentId === null ? "/" : getDisplayKey(node, state.tree);
      if (keyText.length > maxKey) maxKey = keyText.length;
      const segments =
        node.path === "/" ? 0 : node.path.split("/").filter(Boolean).length;
      const depth = segments - baseSegments;
      if (depth > maxD) maxD = depth;
    }
    return { maxKeyLength: maxKey, maxDepth: maxD };
  }, [visibleNodes, displayNode.path, state.tree]);

  const handleSelect = useCallback((nodeId: string) => {
    setFormSelectedNodeId(nodeId);
    setEditingNodeId(null);
  }, []);

  const handleToggleCollapse = useCallback((nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleStartEditing = useCallback(
    (nodeId: string) => {
      preEditTreeRef.current = state.tree;
      setEditingNodeId(nodeId);
    },
    [state.tree],
  );

  const scrollToNode = useCallback((nodeId: string) => {
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector(
        `[data-form-node-id="${nodeId}"]`,
      );
      el?.scrollIntoView({ block: "nearest" });
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editingNodeId) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          if (preEditTreeRef.current) {
            actions.setTree(preEditTreeRef.current);
            preEditTreeRef.current = null;
          }
          setEditingNodeId(null);
          containerRef.current?.focus();
        } else if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          preEditTreeRef.current = null;
          setEditingNodeId(null);
          containerRef.current?.focus();
        }
        return;
      }

      const currentIndex = visibleNodes.findIndex(
        (n) => n.id === formSelectedNodeId,
      );

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = visibleNodes[currentIndex + 1];
          if (next) {
            setFormSelectedNodeId(next.id);
            scrollToNode(next.id);
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = visibleNodes[currentIndex - 1];
          if (prev) {
            setFormSelectedNodeId(prev.id);
            scrollToNode(prev.id);
          }
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          const node = currentIndex >= 0 ? visibleNodes[currentIndex] : null;
          if (node && (node.type === "object" || node.type === "array")) {
            if (collapsedIds.has(node.id)) {
              setCollapsedIds((prev) => {
                const next = new Set(prev);
                next.delete(node.id);
                return next;
              });
            } else if (node.children.length > 0) {
              setFormSelectedNodeId(node.children[0].id);
              scrollToNode(node.children[0].id);
            }
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const current = currentIndex >= 0 ? visibleNodes[currentIndex] : null;
          if (!current) break;
          const isContainer =
            current.type === "object" || current.type === "array";
          if (isContainer && !collapsedIds.has(current.id)) {
            setCollapsedIds((prev) => {
              const next = new Set(prev);
              next.add(current.id);
              return next;
            });
          } else if (current.parentId) {
            const parentInVisible = visibleNodes.find(
              (n) => n.id === current.parentId,
            );
            if (parentInVisible) {
              setFormSelectedNodeId(parentInVisible.id);
              scrollToNode(parentInVisible.id);
            }
          }
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (formSelectedNodeId) {
            preEditTreeRef.current = state.tree;
            setEditingNodeId(formSelectedNodeId);
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setEditingNodeId(null);
          break;
        }
        case "Delete":
        case "Backspace": {
          e.preventDefault();
          const toDelete =
            currentIndex >= 0 ? visibleNodes[currentIndex] : null;
          if (toDelete && toDelete.parentId) {
            const nextSelect =
              visibleNodes[currentIndex + 1] ?? visibleNodes[currentIndex - 1];
            const newTree = removeNode(state.tree, toDelete.id);
            actions.setTree(newTree);
            if (nextSelect && nextSelect.id !== toDelete.id) {
              setFormSelectedNodeId(nextSelect.id);
            } else {
              setFormSelectedNodeId(null);
            }
          }
          break;
        }
      }
    },
    [
      visibleNodes,
      formSelectedNodeId,
      editingNodeId,
      collapsedIds,
      scrollToNode,
      state.tree,
      actions,
    ],
  );

  return (
    <div
      className={className}
      style={{
        backgroundColor: "var(--vj-bg, #1e1e1e)",
        color: "var(--vj-text, #cccccc)",
        height: "100%",
        fontFamily: "var(--vj-font, monospace)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "4px 8px",
          borderBottom: "1px solid var(--vj-border, #333333)",
          backgroundColor: "var(--vj-bg-panel, #252526)",
          flexShrink: 0,
        }}
      >
        <Breadcrumbs />
      </div>
      <div
        ref={containerRef}
        data-form-container
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsFocused(false);
          }
        }}
        style={{
          flex: 1,
          overflow: "auto",
          outline: "none",
        }}
      >
        <FormField
          node={displayNode}
          schema={state.schema}
          rootSchema={rootSchema}
          depth={0}
          showDescriptions={showDescriptions}
          showCounts={showCounts}
          formSelectedNodeId={formSelectedNodeId}
          editingNodeId={editingNodeId}
          collapsedIds={collapsedIds}
          maxKeyLength={maxKeyLength}
          maxDepth={maxDepth}
          isFocused={isFocused}
          dragState={dragState}
          onSelect={handleSelect}
          onToggleCollapse={handleToggleCollapse}
          onStartEditing={handleStartEditing}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
        />
      </div>
    </div>
  );
}
