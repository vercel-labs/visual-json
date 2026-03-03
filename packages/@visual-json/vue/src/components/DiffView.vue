<script setup lang="ts">
import { computed } from "vue";
import { computeDiff, type DiffEntry } from "@visual-json/core";
import { DIFF_COLORS, formatValue } from "@internal/ui";

const props = defineProps<{
  originalJson: unknown;
  currentJson: unknown;
  class?: string;
}>();

const entries = computed(() =>
  computeDiff(props.originalJson as never, props.currentJson as never),
);

const added = computed(() => entries.value.filter((e) => e.type === "added").length);
const removed = computed(() => entries.value.filter((e) => e.type === "removed").length);
const changed = computed(() => entries.value.filter((e) => e.type === "changed").length);

function getColors(entry: DiffEntry) {
  return DIFF_COLORS[entry.type];
}
</script>

<template>
  <div
    :style="{
      backgroundColor: 'var(--vj-bg, #1e1e1e)',
      color: 'var(--vj-text, #cccccc)',
      overflow: 'auto',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }"
  >
    <div
      :style="{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '6px 12px',
        borderBottom: '1px solid var(--vj-border, #333333)',
        backgroundColor: 'var(--vj-bg-panel, #252526)',
        fontFamily: 'var(--vj-font, monospace)',
        fontSize: '12px',
        flexShrink: 0,
      }"
    >
      <span :style="{ color: 'var(--vj-text-muted, #999999)' }">
        {{ entries.length === 0 ? "No changes" : `${entries.length} changes` }}
      </span>
      <span v-if="added > 0" :style="{ color: '#4ec94e' }">+{{ added }} added</span>
      <span v-if="removed > 0" :style="{ color: '#f48771' }">-{{ removed }} removed</span>
      <span v-if="changed > 0" :style="{ color: '#dcdcaa' }">~{{ changed }} modified</span>
    </div>
    <div :style="{ flex: 1, overflow: 'auto' }">
      <div
        v-if="entries.length === 0"
        :style="{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--vj-text-dimmer, #555555)',
          fontFamily: 'var(--vj-font, monospace)',
          fontSize: '13px',
        }"
      >
        No differences detected
      </div>
      <div
        v-for="(entry, i) in entries"
        :key="i"
        :style="{
          display: 'flex',
          alignItems: 'flex-start',
          padding: '3px 12px',
          borderBottom: '1px solid var(--vj-border-subtle, #2a2a2a)',
          backgroundColor: getColors(entry).bg,
          fontFamily: 'var(--vj-font, monospace)',
          fontSize: '12px',
          gap: '8px',
        }"
      >
        <span
          :style="{
            color: getColors(entry).label,
            fontWeight: 600,
            width: '14px',
            flexShrink: 0,
            textAlign: 'center',
          }"
        >
          {{ getColors(entry).marker }}
        </span>
        <span
          :style="{
            color: 'var(--vj-text, #cccccc)',
            flexShrink: 0,
            minWidth: '100px',
          }"
        >
          {{ entry.path }}
        </span>
        <span :style="{ flex: 1, display: 'flex', gap: '8px', overflow: 'hidden' }">
          <template v-if="entry.type === 'changed'">
            <span :style="{ color: '#f48771', textDecoration: 'line-through' }">
              {{ formatValue(entry.oldValue) }}
            </span>
            <span :style="{ color: 'var(--vj-text-dim, #666666)' }">&rarr;</span>
            <span :style="{ color: '#4ec94e' }">
              {{ formatValue(entry.newValue) }}
            </span>
          </template>
          <template v-else-if="entry.type === 'added'">
            <span :style="{ color: '#4ec94e' }">
              {{ formatValue(entry.newValue) }}
            </span>
          </template>
          <template v-else-if="entry.type === 'removed'">
            <span :style="{ color: '#f48771', textDecoration: 'line-through' }">
              {{ formatValue(entry.oldValue) }}
            </span>
          </template>
        </span>
      </div>
    </div>
  </div>
</template>
