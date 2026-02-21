import { useState, useCallback, useRef } from "react";
import {
  setValue,
  setKey,
  addProperty,
  removeNode,
  changeType,
  duplicateNode,
  toJson,
  getPropertySchema,
  resolveRef,
  type TreeNode,
  type NodeType,
  type JsonSchemaProperty,
} from "@visual-json/core";
import { EnumInput } from "./enum-input";
import { useStudio } from "./context";
import { Breadcrumbs } from "./breadcrumbs";

const ALL_TYPES: NodeType[] = [
  "string",
  "number",
  "boolean",
  "null",
  "object",
  "array",
];

interface PropertyRowProps {
  node: TreeNode;
  schemaProperty?: JsonSchemaProperty;
}

function PropertyRow({ node, schemaProperty }: PropertyRowProps) {
  const { state, actions } = useStudio();
  const isContainer = node.type === "object" || node.type === "array";
  const [hoveredRow, setHoveredRow] = useState(false);
  const enumRef = useRef<HTMLInputElement>(null);

  function handleValueChange(newValue: string) {
    let parsed: string | number | boolean | null;
    if (newValue === "null") parsed = null;
    else if (newValue === "true") parsed = true;
    else if (newValue === "false") parsed = false;
    else if (
      (node.type === "number" ||
        schemaProperty?.type === "number" ||
        schemaProperty?.type === "integer") &&
      !isNaN(Number(newValue)) &&
      newValue.trim() !== ""
    )
      parsed = Number(newValue);
    else parsed = newValue;

    const newTree = setValue(state.tree, node.id, parsed);
    actions.setTree(newTree);
  }

  function handleKeyChange(newKey: string) {
    const newTree = setKey(state.tree, node.id, newKey);
    actions.setTree(newTree);
  }

  function handleRemove() {
    const newTree = removeNode(state.tree, node.id);
    actions.setTree(newTree);
  }

  function handleAddChild() {
    const key =
      node.type === "array"
        ? String(node.children.length)
        : `key${node.children.length}`;
    const newTree = addProperty(state.tree, node.id, key, "");
    actions.setTree(newTree);
  }

  function displayValue(): string {
    if (isContainer) {
      return node.type === "array"
        ? `[${node.children.length} items]`
        : `{${node.children.length} keys}`;
    }
    if (node.value === null) return "";
    if (node.value === undefined) return "";
    if (typeof node.value === "string" && node.value === "") return "";
    return String(node.value);
  }

  const hasEnumValues = schemaProperty?.enum && schemaProperty.enum.length > 0;
  const description = schemaProperty?.description;

  return (
    <div
      onMouseEnter={() => setHoveredRow(true)}
      onMouseLeave={() => setHoveredRow(false)}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 12px",
          borderBottom: "1px solid var(--vj-border-subtle, #2a2a2a)",
          minHeight: 32,
          backgroundColor: hoveredRow
            ? "var(--vj-bg-hover, #2a2d2e)"
            : "transparent",
        }}
      >
        <input
          value={node.key}
          onChange={(e) => handleKeyChange(e.target.value)}
          style={{
            background: "none",
            border: "1px solid transparent",
            borderRadius: 3,
            color: "var(--vj-text, #cccccc)",
            fontFamily: "var(--vj-font, monospace)",
            fontSize: "var(--vj-input-font-size, 13px)",
            padding: "2px 6px",
            width: 140,
            flexShrink: 0,
          }}
        />
        {!isContainer ? (
          hasEnumValues ? (
            <EnumInput
              enumValues={schemaProperty!.enum!}
              value={displayValue()}
              onValueChange={handleValueChange}
              inputRef={enumRef}
              inputStyle={{
                background: "none",
                border: "1px solid transparent",
                borderRadius: 3,
                color:
                  node.type === "string"
                    ? "var(--vj-string, #ce9178)"
                    : "var(--vj-number, #b5cea8)",
                fontFamily: "var(--vj-font, monospace)",
                fontSize: "var(--vj-input-font-size, 13px)",
                padding: "2px 6px",
                flex: 1,
                outline: "none",
              }}
            />
          ) : (
            <input
              value={displayValue()}
              onChange={(e) => handleValueChange(e.target.value)}
              placeholder="<value>"
              style={{
                background: "none",
                border: "1px solid transparent",
                borderRadius: 3,
                color:
                  node.type === "string"
                    ? "var(--vj-string, #ce9178)"
                    : "var(--vj-number, #b5cea8)",
                fontFamily: "var(--vj-font, monospace)",
                fontSize: "var(--vj-input-font-size, 13px)",
                padding: "2px 6px",
                flex: 1,
                textAlign: "right",
              }}
            />
          )
        ) : (
          <span
            style={{
              color: "var(--vj-text-dim, #666666)",
              fontFamily: "var(--vj-font, monospace)",
              fontSize: 13,
              flex: 1,
              textAlign: "right",
            }}
          >
            {displayValue()}
          </span>
        )}
        <div
          style={{
            display: "flex",
            gap: 2,
            opacity: hoveredRow ? 1 : 0,
            transition: "opacity 0.1s",
            flexShrink: 0,
          }}
        >
          {isContainer && (
            <button
              onClick={handleAddChild}
              style={{
                background: "none",
                border: "none",
                color: "var(--vj-text-muted, #888888)",
                cursor: "pointer",
                padding: "2px 4px",
                fontSize: 15,
                fontFamily: "var(--vj-font, monospace)",
                borderRadius: 3,
                lineHeight: 1,
              }}
              title="Add child"
            >
              +
            </button>
          )}
          <button
            onClick={handleRemove}
            style={{
              background: "none",
              border: "none",
              color: "var(--vj-text-muted, #888888)",
              cursor: "pointer",
              padding: "2px 4px",
              fontSize: 15,
              fontFamily: "var(--vj-font, monospace)",
              borderRadius: 3,
              lineHeight: 1,
            }}
            title="Remove"
          >
            &times;
          </button>
        </div>
      </div>
      {description && (
        <div
          style={{
            padding: "2px 12px 4px 44px",
            fontSize: 11,
            color: "var(--vj-text-dim, #666666)",
            fontFamily: "var(--vj-font, monospace)",
            borderBottom: "1px solid var(--vj-border-subtle, #2a2a2a)",
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}

export interface PropertyEditorProps {
  className?: string;
}

export function PropertyEditor({ className }: PropertyEditorProps) {
  const { state, actions } = useStudio();
  const selectedNode = state.selectedNodeId
    ? state.tree.nodesById.get(state.selectedNodeId)
    : null;

  const handleChangeType = useCallback(
    (newType: NodeType) => {
      if (!selectedNode) return;
      const newTree = changeType(state.tree, selectedNode.id, newType);
      actions.setTree(newTree);
    },
    [state.tree, selectedNode, actions],
  );

  const handleDuplicate = useCallback(() => {
    if (!selectedNode) return;
    const newTree = duplicateNode(state.tree, selectedNode.id);
    actions.setTree(newTree);
  }, [state.tree, selectedNode, actions]);

  const handleCopyPath = useCallback(() => {
    if (!selectedNode) return;
    navigator.clipboard.writeText(selectedNode.path).catch(() => {});
  }, [selectedNode]);

  const handleCopyValue = useCallback(() => {
    if (!selectedNode) return;
    const value = toJson(selectedNode);
    const text =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    navigator.clipboard.writeText(text).catch(() => {});
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--vj-bg, #1e1e1e)",
          color: "var(--vj-text-dimmer, #555555)",
          fontFamily: "var(--vj-font, monospace)",
          fontSize: 13,
          height: "100%",
        }}
      >
        Select a node to edit
      </div>
    );
  }

  const isContainer =
    selectedNode.type === "object" || selectedNode.type === "array";

  const schema = state.schema ?? undefined;
  const schemaTitle = schema?.title;

  function getChildSchema(childKey: string): JsonSchemaProperty | undefined {
    if (!schema || !selectedNode) return undefined;
    const childPath =
      selectedNode.path === "/"
        ? `/${childKey}`
        : `${selectedNode.path}/${childKey}`;
    const raw = getPropertySchema(schema, childPath);
    return raw ? resolveRef(raw, schema) : undefined;
  }

  function handleAdd() {
    if (!selectedNode) return;
    const key =
      selectedNode.type === "array"
        ? String(selectedNode.children.length)
        : `key${selectedNode.children.length}`;
    const newTree = addProperty(state.tree, selectedNode.id, key, "");
    actions.setTree(newTree);
  }

  return (
    <div
      className={className}
      style={{
        backgroundColor: "var(--vj-bg, #1e1e1e)",
        color: "var(--vj-text, #cccccc)",
        overflow: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: "1px solid var(--vj-border, #333333)",
          fontSize: 12,
          color: "var(--vj-text-muted, #999999)",
          fontFamily: "var(--vj-font, monospace)",
          flexShrink: 0,
          backgroundColor: "var(--vj-bg-panel, #252526)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Breadcrumbs />
          {schemaTitle && (
            <span
              style={{ fontSize: 10, color: "var(--vj-text-dim, #666666)" }}
            >
              {schemaTitle}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <select
            value={selectedNode.type}
            onChange={(e) => handleChangeType(e.target.value as NodeType)}
            style={{
              background: "var(--vj-input-bg, #3c3c3c)",
              border: "1px solid var(--vj-input-border, #555555)",
              borderRadius: 3,
              color: "var(--vj-text, #cccccc)",
              fontSize: "var(--vj-input-font-size, 13px)",
              fontFamily: "var(--vj-font, monospace)",
              padding: "1px 4px",
              cursor: "pointer",
            }}
            title="Change type"
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={handleCopyPath}
            style={actionButtonStyle}
            title="Copy path"
          >
            path
          </button>
          <button
            onClick={handleCopyValue}
            style={actionButtonStyle}
            title="Copy value"
          >
            value
          </button>
          {selectedNode.parentId && (
            <button
              onClick={handleDuplicate}
              style={actionButtonStyle}
              title="Duplicate"
            >
              dup
            </button>
          )}
          {isContainer && (
            <button
              onClick={handleAdd}
              style={{
                ...actionButtonStyle,
                border: "1px solid var(--vj-input-border, #555555)",
              }}
            >
              + Add
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {isContainer ? (
          selectedNode.children.map((child) => (
            <PropertyRow
              key={child.id}
              node={child}
              schemaProperty={getChildSchema(child.key)}
            />
          ))
        ) : (
          <PropertyRow node={selectedNode} />
        )}
      </div>
    </div>
  );
}

const actionButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  borderRadius: 3,
  color: "var(--vj-text-muted, #888888)",
  cursor: "pointer",
  padding: "1px 6px",
  fontSize: 11,
  fontFamily: "var(--vj-font, monospace)",
};
