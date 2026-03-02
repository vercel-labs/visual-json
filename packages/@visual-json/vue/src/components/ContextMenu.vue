<script setup lang="ts">
import { shallowRef, watch, onMounted, onUnmounted, nextTick } from "vue";

export interface ContextMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
  separator?: false;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

const props = defineProps<{
  x: number;
  y: number;
  items: ContextMenuEntry[];
}>();

const emit = defineEmits<{
  close: [];
}>();

const menuRef = shallowRef<HTMLDivElement | null>(null);
const pos = shallowRef({ left: props.x, top: props.y });

watch(
  () => [props.x, props.y],
  async () => {
    await nextTick();
    if (!menuRef.value) return;
    const rect = menuRef.value.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    pos.value = {
      left: rect.right > vw ? Math.max(0, props.x - rect.width) : props.x,
      top: rect.bottom > vh ? Math.max(0, props.y - rect.height) : props.y,
    };
  },
  { immediate: true },
);

function handleClick(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit("close");
  }
}

function handleKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}

onMounted(async () => {
  await nextTick();
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    pos.value = {
      left: rect.right > vw ? Math.max(0, props.x - rect.width) : props.x,
      top: rect.bottom > vh ? Math.max(0, props.y - rect.height) : props.y,
    };
  }
  document.addEventListener("mousedown", handleClick);
  document.addEventListener("keydown", handleKey);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClick);
  document.removeEventListener("keydown", handleKey);
});
</script>

<template>
  <Teleport to="body">
    <div
      ref="menuRef"
      :style="{
        position: 'fixed',
        left: pos.left + 'px',
        top: pos.top + 'px',
        zIndex: 10000,
        backgroundColor: 'var(--vj-bg-panel, #252526)',
        border: '1px solid var(--vj-border, #454545)',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        padding: '4px 0',
        minWidth: '160px',
      }"
    >
      <template v-for="(item, i) in items" :key="i">
        <div
          v-if="'separator' in item && item.separator"
          :style="{
            height: '1px',
            backgroundColor: 'var(--vj-border, #454545)',
            margin: '4px 0',
          }"
        />
        <button
          v-else-if="'label' in item"
          :disabled="item.disabled"
          :style="{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: 'none',
            border: 'none',
            color: item.disabled
              ? 'var(--vj-text-dimmer, #555555)'
              : 'var(--vj-text, #cccccc)',
            cursor: item.disabled ? 'default' : 'pointer',
            padding: '4px 16px',
            fontSize: '12px',
            fontFamily: 'var(--vj-font, monospace)',
          }"
          @click="
            () => {
              if (!item.disabled) {
                item.action();
                emit('close');
              }
            }
          "
          @mouseenter="
            (e) => {
              if (!item.disabled)
                (e.target as HTMLElement).style.backgroundColor =
                  'var(--vj-accent-muted, #094771)';
            }
          "
          @mouseleave="
            (e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }
          "
        >
          {{ item.label }}
        </button>
      </template>
    </div>
  </Teleport>
</template>
