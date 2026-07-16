<script setup lang="ts">
import { ref } from "vue";
import EntityGraph from "./EntityGraph.vue";
import type { GraphNode, GraphEdge } from "~/lib/entityGraph";

const props = defineProps<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerIrdi: string;
  dict: string;
}>();

const showGraph = ref(false);
</script>

<template>
  <div>
    <button
      type="button"
      @click="showGraph = true"
      class="inline-flex items-center gap-1.5 rounded-lg border border-paper-300 bg-paper-50 px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:border-lapis-400 hover:bg-lapis-50/30 hover:text-lapis-700 print:hidden"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="h-3.5 w-3.5">
        <circle cx="5" cy="5" r="2.5" />
        <circle cx="15" cy="5" r="2.5" />
        <circle cx="10" cy="15" r="2.5" />
        <line x1="6.8" y1="6.8" x2="13.2" y2="13.2" />
        <line x1="13.2" y1="6.8" x2="6.8" y2="13.2" />
        <line x1="7.5" y1="5" x2="12.5" y2="5" />
      </svg>
      Relationships
    </button>

    <EntityGraph
      v-if="showGraph"
      :nodes="nodes"
      :edges="edges"
      :center-irdi="centerIrdi"
      :dict="dict"
      @close="showGraph = false"
    />
  </div>
</template>
