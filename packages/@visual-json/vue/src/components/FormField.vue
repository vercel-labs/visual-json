<script setup lang="ts">
import { shallowRef, inject, computed, watch, nextTick } from "vue";
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
import { useStudio } from "../composables/use-studio";
import { FORM_VIEW_KEY } from "./form-view-context";
import EnumInput from "./EnumInput.vue";

// Self-import for recursion
import FormField from "./FormField.vue";

const props = defineProps<{
  node: TreeNode;
  depth: number;
}>();

const ctx = inject(FORM_VIEW_KEY)!;
const { state, actions } = useStudio();

const hovered = shallowRef(false);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const valueInputRef = shallowRef<any>(null);
const keyInputRef = shallowRef<HTMLInputElement | null>(null);

function focusValueInput() {
  if (valueInputRef.value && typeof valueInputRef.value.focus === "function") {
    valueInputRef.value.focus();
  }
}

const isContainer = computed(
  () => props.node.type === "object" || props.node.type === "array",
);
const isRoot = computed(() => props.node.parentId === null);
const isSelected = computed(
  () => state.selectedNodeIds.value.has(props.node.id),
);
const isEditing = computed(() => ctx.editingNodeId.value === props.node.id);
const collapsed = computed(() => ctx.collapsedIds.value.has(props.node.id));

const parentIsObject = computed(() => {
  if (!props.node.parentId) return false;
  return state.tree.value.nodesById.get(props.node.parentId)?.type === "object";
});

const propSchema = computed(() =>
  getResolvedSchema(
    ctx.schema.value,
    ctx.rootSchema.value,
    props.node.path,
  ),
);

const isRequired = computed(() =>
  checkRequiredFn(props.node, ctx.schema.value, ctx.rootSchema.value),
);
const description = computed(() => propSchema.value?.description);
const isDeprecated = computed(() => propSchema.value?.deprecated);
const fieldTitle = computed(() => propSchema.value?.title);

const isDragTarget = computed(
  () => ctx.dragState.value.dropTargetNodeId === props.node.id,
);
const isDraggedNode = computed(
  () => ctx.dragState.value.draggedNodeIds.has(props.node.id),
);

function getBorderTopColor() {
  if (isDragTarget.value && ctx.dragState.value.dropPosition === "before") {
    return "var(--vj-accent, #007acc)";
  }
  return "transparent";
}

function getBorderBottomColor() {
  if (isDragTarget.value && ctx.dragState.value.dropPosition === "after") {
    return "var(--vj-accent, #007acc)";
  }
  return "transparent";
}

function getRowBg() {
  if (isSelected.value) {
    return ctx.isFocused.value
      ? "var(--vj-bg-selected, #2a5a1e)"
      : "var(--vj-bg-selected-muted, var(--vj-bg-hover, #2a2d2e))";
  }
  if (hovered.value) return "var(--vj-bg-hover, #2a2d2e)";
  return "transparent";
}

function getRowColor() {
  return isSelected.value && ctx.isFocused.value
    ? "var(--vj-text-selected, var(--vj-text, #cccccc))"
    : "var(--vj-text, #cccccc)";
}

function getValueColor(): string {
  return getValueColorFn(props.node);
}

function getDisplayValue(): string {
  return getDisplayValueFn(props.node);
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  ctx.onDragOver(props.node.id, e.clientY < midY ? "before" : "after");
}

function handleDragStart(e: DragEvent) {
  e.dataTransfer!.effectAllowed = "move";
  if (
    state.selectedNodeIds.value.size > 1 &&
    state.selectedNodeIds.value.has(props.node.id)
  ) {
    setMultiDragImage(e.dataTransfer!, state.selectedNodeIds.value.size);
  }
  ctx.onDragStart(props.node.id);
}

function handleValueChange(newValue: string) {
  const parsed = parseInputValue(newValue, propSchema.value?.type, props.node.type);
  const newTree = setValue(state.tree.value, props.node.id, parsed);
  actions.setTree(newTree);
}

function handleKeyChange(newKey: string) {
  const newTree = setKey(state.tree.value, props.node.id, newKey);
  actions.setTree(newTree);
}

function handleRemove() {
  const newTree = removeNode(state.tree.value, props.node.id);
  actions.setTree(newTree);
}

function handleAddChild() {
  const key =
    props.node.type === "array"
      ? String(props.node.children.length)
      : `newKey${props.node.children.length}`;
  const newTree = addProperty(state.tree.value, props.node.id, key, "");
  actions.setTree(newTree);
}

const hasEnumValues = computed(
  () => propSchema.value?.enum && propSchema.value.enum.length > 0,
);

const keyWidth = computed(
  () =>
    `calc(${(ctx.maxDepth.value - props.depth) * 16}px + ${ctx.maxKeyLength.value}ch)`,
);

// Focus the appropriate input when editing starts
watch(isEditing, async (editing) => {
  if (!editing) return;
  await nextTick();
  if (!isContainer.value) {
    const hasValue =
      props.node.value !== null &&
      props.node.value !== undefined &&
      props.node.value !== "";
    if (hasValue && valueInputRef.value) {
      focusValueInput();
    } else if (keyInputRef.value) {
      keyInputRef.value.focus();
    }
  } else if (keyInputRef.value) {
    keyInputRef.value.focus();
  }
});
</script>

<template>
  <!-- Container node (object or array) -->
  <div v-if="isContainer">
    <div
      :data-form-node-id="node.id"
      :draggable="!isRoot"
      :style="{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '1px 8px',
        paddingLeft: 8 + depth * 16 + 'px',
        cursor: 'pointer',
        backgroundColor: getRowBg(),
        color: getRowColor(),
        height: '28px',
        boxSizing: 'border-box',
        userSelect: 'none',
        opacity: isDeprecated ? 0.5 : isDraggedNode ? 0.4 : 1,
        borderTop: `2px solid ${getBorderTopColor()}`,
        borderBottom: `2px solid ${getBorderBottomColor()}`,
      }"
      @click.stop="(e) => ctx.onSelect(node.id, e)"
      @dblclick="() => ctx.onToggleCollapse(node.id)"
      @mouseenter="() => (hovered = true)"
      @mouseleave="() => (hovered = false)"
      @dragstart="handleDragStart"
      @dragover="handleDragOver"
      @dragend="() => ctx.onDragEnd()"
      @drop.prevent="() => ctx.onDrop()"
    >
      <button
        :style="{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: 0,
          width: '16px',
          fontSize: '9px',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.15s',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
        }"
        @click.stop="() => ctx.onToggleCollapse(node.id)"
      >
        &#9654;
      </button>

      <input
        v-if="isEditing && !isRoot"
        ref="keyInputRef"
        :value="node.key"
        :style="{
          background: 'none',
          border: 'none',
          color: 'inherit',
          fontFamily: 'var(--vj-font, monospace)',
          fontSize: 'var(--vj-input-font-size, 13px)',
          fontWeight: 500,
          padding: 0,
          outline: 'none',
          flexShrink: 0,
          width: keyWidth,
        }"
        @input="(e) => handleKeyChange((e.target as HTMLInputElement).value)"
        @click.stop
      />
      <span
        v-else
        :style="{
          color:
            !isRoot && !parentIsObject && !isSelected
              ? 'var(--vj-text-muted, #888888)'
              : 'inherit',
          fontSize: 'var(--vj-input-font-size, 13px)',
          fontFamily: 'var(--vj-font, monospace)',
          fontWeight: 500,
          flexShrink: 0,
          display: 'inline-block',
          width: keyWidth,
        }"
      >
        {{ isRoot ? "/" : getDisplayKey(node, state.tree.value) }}
      </span>

      <span
        v-if="ctx.showDescriptions && fieldTitle && !isSelected"
        :style="{
          color: 'var(--vj-text-muted, #888888)',
          fontSize: '11px',
          fontFamily: 'var(--vj-font, monospace)',
        }"
      >
        {{ fieldTitle }}
      </span>

      <button
        v-if="hovered"
        :style="{
          background: 'none',
          border: 'none',
          color: isSelected ? 'inherit' : 'var(--vj-text-muted, #888888)',
          cursor: 'pointer',
          padding: 0,
          fontSize: '12px',
          fontFamily: 'var(--vj-font, monospace)',
        }"
        @click.stop="handleAddChild"
      >
        + Add {{ node.type === "array" ? "item" : "property" }}
      </button>

      <span
        v-if="ctx.showCounts"
        :style="{
          color: isSelected ? 'inherit' : 'var(--vj-text-dim, #666666)',
          fontSize: '12px',
          fontFamily: 'var(--vj-font, monospace)',
          marginLeft: 'auto',
        }"
      >
        {{
          node.type === "array"
            ? `${node.children.length} items`
            : `${node.children.length} properties`
        }}
      </span>

      <button
        v-if="!isRoot && isEditing"
        :style="{
          background: 'none',
          border: 'none',
          color: isSelected ? 'inherit' : 'var(--vj-text-muted, #888888)',
          cursor: 'pointer',
          padding: '2px 4px',
          fontSize: '14px',
          fontFamily: 'var(--vj-font, monospace)',
          ...(!ctx.showCounts ? { marginLeft: 'auto' } : {}),
        }"
        title="Remove"
        @click.stop="handleRemove"
      >
        &times;
      </button>
    </div>

    <div
      v-if="ctx.showDescriptions && description"
      :style="{
        padding: '2px 12px 4px',
        paddingLeft: 8 + depth * 16 + 22 + 'px',
        fontSize: '11px',
        color: 'var(--vj-text-dim, #666666)',
        fontFamily: 'var(--vj-font, monospace)',
      }"
    >
      {{ description }}
    </div>

    <div v-if="!collapsed">
      <FormField
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </div>

  <!-- Leaf node -->
  <div
    v-else
    :data-form-node-id="node.id"
    :draggable="!isRoot"
    :style="{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '1px 8px',
      paddingLeft: 8 + depth * 16 + 'px',
      cursor: 'pointer',
      backgroundColor: getRowBg(),
      color: getRowColor(),
      height: '28px',
      boxSizing: 'border-box',
      userSelect: 'none',
      opacity: isDeprecated ? 0.5 : isDraggedNode ? 0.4 : 1,
      borderTop: `2px solid ${getBorderTopColor()}`,
      borderBottom: `2px solid ${getBorderBottomColor()}`,
    }"
    @click.stop="(e) => ctx.onSelect(node.id, e)"
    @dblclick="() => ctx.onStartEditing(node.id)"
    @mouseenter="() => (hovered = true)"
    @mouseleave="() => (hovered = false)"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @dragend="() => ctx.onDragEnd()"
    @drop.prevent="() => ctx.onDrop()"
  >
    <span :style="{ width: '16px', flexShrink: 0 }" />

    <input
      v-if="isEditing && parentIsObject"
      ref="keyInputRef"
      :value="node.key"
      :style="{
        background: 'none',
        border: 'none',
        color: 'inherit',
        fontFamily: 'var(--vj-font, monospace)',
        fontSize: 'var(--vj-input-font-size, 13px)',
        padding: 0,
        flexShrink: 0,
        outline: 'none',
        width: keyWidth,
      }"
      @input="(e) => handleKeyChange((e.target as HTMLInputElement).value)"
      @click.stop
      @keydown="
        (e: KeyboardEvent) => {
          if (e.key === 'Tab' && !e.shiftKey && valueInputRef) {
            e.preventDefault();
            focusValueInput();
          }
        }
      "
    />
    <span
      v-else
      :style="{
        color:
          !parentIsObject && !isSelected
            ? 'var(--vj-text-muted, #888888)'
            : 'inherit',
        fontSize: 'var(--vj-input-font-size, 13px)',
        fontFamily: 'var(--vj-font, monospace)',
        flexShrink: 0,
        display: 'inline-block',
        width: keyWidth,
      }"
    >
      {{ getDisplayKey(node, state.tree.value) }}
    </span>

    <span
      v-if="isRequired && !isSelected"
      :style="{
        color: 'var(--vj-error, #f48771)',
        fontSize: '10px',
        fontFamily: 'var(--vj-font, monospace)',
      }"
    >
      *
    </span>

    <!-- Editing value -->
    <div
      v-if="isEditing"
      :style="{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        minWidth: 0,
      }"
    >
      <!-- Boolean: EnumInput -->
      <EnumInput
        v-if="node.type === 'boolean'"
        ref="valueInputRef"
        :enum-values="['true', 'false']"
        :value="String(node.value)"
        :input-style="{
          background: 'none',
          border: 'none',
          fontFamily: 'var(--vj-font, monospace)',
          fontSize: 'var(--vj-input-font-size, 13px)',
          padding: '0',
          flex: '1',
          outline: 'none',
          color: getValueColor(),
        }"
        @value-change="handleValueChange"
      />
      <!-- Enum: EnumInput -->
      <EnumInput
        v-else-if="hasEnumValues && propSchema?.enum"
        ref="valueInputRef"
        :enum-values="propSchema.enum"
        :value="getDisplayValue()"
        :input-style="{
          background: 'none',
          border: 'none',
          fontFamily: 'var(--vj-font, monospace)',
          fontSize: 'var(--vj-input-font-size, 13px)',
          padding: '0',
          flex: '1',
          outline: 'none',
          color: getValueColor(),
        }"
        @value-change="handleValueChange"
      />
      <!-- Null: display only -->
      <span
        v-else-if="node.type === 'null'"
        :style="{
          color: 'var(--vj-boolean, #569cd6)',
          fontFamily: 'var(--vj-font, monospace)',
          fontSize: 'var(--vj-input-font-size, 13px)',
          fontStyle: 'italic',
          flex: 1,
        }"
      >
        null
      </span>
      <!-- Text/number input -->
      <input
        v-else
        ref="valueInputRef"
        :value="getDisplayValue()"
        :placeholder="
          propSchema?.default !== undefined
            ? String(propSchema.default)
            : '<value>'
        "
        :style="{
          background: 'none',
          border: 'none',
          fontFamily: 'var(--vj-font, monospace)',
          fontSize: 'var(--vj-input-font-size, 13px)',
          padding: 0,
          flex: 1,
          outline: 'none',
          color: getValueColor(),
        }"
        @input="(e) => handleValueChange((e.target as HTMLInputElement).value)"
        @click.stop
      />
    </div>

    <!-- Display value (not editing) -->
    <span
      v-else
      :style="{
        color: getValueColor(),
        fontSize: 'var(--vj-input-font-size, 13px)',
        fontFamily: 'var(--vj-font, monospace)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontStyle: node.type === 'null' ? 'italic' : undefined,
      }"
    >
      {{ getDisplayValue() }}
    </span>

    <button
      v-if="isEditing"
      :style="{
        background: 'none',
        border: 'none',
        color: isSelected ? 'inherit' : 'var(--vj-text-muted, #888888)',
        cursor: 'pointer',
        padding: '2px 4px',
        fontSize: '14px',
        fontFamily: 'var(--vj-font, monospace)',
        flexShrink: 0,
      }"
      title="Remove"
      @click.stop="handleRemove"
    >
      &times;
    </button>
  </div>
</template>
