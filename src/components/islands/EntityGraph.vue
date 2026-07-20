<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import type { GraphNode, GraphEdge, EdgeKind } from "~/lib/entityGraph";

const props = defineProps<{
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerIrdi: string;
  dict: string;
}>();

const emit = defineEmits<{ close: [] }>();

const depth = ref<1 | 2>(1);
const hoveredNode = ref<GraphNode | null>(null);
const selectedNode = ref<GraphNode | null>(null);

const EDGE_COLORS: Record<EdgeKind, string> = {
  superclass: "var(--color-lapis-400)",
  subclass: "var(--color-lapis-300)",
  property: "var(--color-teal-400)",
  unit: "var(--color-rose-400)",
  value_list: "var(--color-hex-400)",
  instance: "var(--color-violet-400)",
  relation_domain: "var(--color-ink-400)",
  relation_codomain: "var(--color-ink-300)",
  used_by: "var(--color-teal-300)",
};

const EDGE_LABELS: Record<EdgeKind, string> = {
  superclass: "parent",
  subclass: "child",
  property: "property",
  unit: "unit",
  value_list: "values",
  instance: "instance",
  relation_domain: "relation",
  relation_codomain: "codomain",
  used_by: "used by",
};

const TYPE_FILL: Record<string, string> = {
  class: "var(--color-teal-500)",
  property: "var(--color-emerald-500)",
  unit: "var(--color-rose-500)",
  value_list: "var(--color-hex-500)",
  value_term: "var(--color-hex-400)",
  relation: "var(--color-violet-500)",
  view_control: "var(--color-ink-500)",
};

const TYPE_LABEL: Record<string, string> = {
  class: "Class",
  property: "Property",
  unit: "Unit",
  value_list: "Value List",
  value_term: "Value Term",
  relation: "Relation",
  view_control: "View Control",
};

const WIDTH = 600;
const HEIGHT = 500;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const R1 = 150;
const R2 = 270;

interface PositionedNode {
  node: GraphNode;
  x: number;
  y: number;
  r: number;
}

const visibleNodes = computed(() => {
  if (depth.value === 1) {
    return props.nodes.filter((n) => n.degree <= 1);
  }
  return props.nodes;
});

const visibleEdgesForDisplay = computed(() => {
  const visibleIrdis = new Set(visibleNodes.value.map((n) => n.irdi));
  return props.edges.filter(
    (e) => visibleIrdis.has(e.source) && visibleIrdis.has(e.target),
  );
});

const positionedNodes = computed<PositionedNode[]>(() => {
  const center = visibleNodes.value.find((n) => n.degree === 0);
  if (!center) return [];

  const result: PositionedNode[] = [];
  result.push({ node: center, x: CENTER_X, y: CENTER_Y, r: 24 });

  const d1 = visibleNodes.value.filter((n) => n.degree === 1);
  const d2 = visibleNodes.value.filter((n) => n.degree === 2);

  const d1Count = d1.length;
  d1.forEach((node, i) => {
    const angle = (i / Math.max(d1Count, 1)) * Math.PI * 2 - Math.PI / 2;
    result.push({
      node,
      x: CENTER_X + Math.cos(angle) * R1,
      y: CENTER_Y + Math.sin(angle) * R1,
      r: 16,
    });
  });

  const d2Count = d2.length;
  d2.forEach((node, i) => {
    const angle = (i / Math.max(d2Count, 1)) * Math.PI * 2 - Math.PI / 2;
    result.push({
      node,
      x: CENTER_X + Math.cos(angle) * R2,
      y: CENTER_Y + Math.sin(angle) * R2,
      r: 10,
    });
  });

  return result;
});

const positionedMap = computed(() => {
  const m = new Map<string, PositionedNode>();
  for (const pn of positionedNodes.value) {
    m.set(pn.node.irdi, pn);
  }
  return m;
});

const visibleEdges = computed(() => {
  return visibleEdgesForDisplay.value
    .map((e) => ({
      ...e,
      s: positionedMap.value.get(e.source),
      t: positionedMap.value.get(e.target),
    }))
    .filter((e) => e.s && e.t);
});

const nodeCount = computed(() => visibleNodes.value.length);
const edgeCount = computed(() => visibleEdges.value.length);

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});

function nodeHref(node: GraphNode): string | null {
  return node.href;
}

function onNodeClick(node: GraphNode) {
  if (node.degree === 0) return;
  const href = nodeHref(node);
  if (href) {
    window.location.href = href;
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 backdrop-blur-sm"
      @click.self="$emit('close')"
    >
      <div
        class="relative max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-paper-300 bg-paper-50 shadow-2xl"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-paper-200 px-5 py-3">
          <div>
            <h2 class="font-display text-lg tracking-tight text-ink-900">
              Relationship graph
            </h2>
            <p class="text-xs text-ink-500">
              {{ nodeCount }} entities · {{ edgeCount }} connections ·
              {{ depth }}-degree neighborhood
            </p>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex rounded-lg border border-paper-300 bg-paper-100 p-0.5">
              <button
                @click="depth = 1"
                :class="[
                  'rounded-md px-3 py-1 text-xs font-medium transition',
                  depth === 1 ? 'bg-lapis-500 text-paper-50' : 'text-ink-500 hover:text-ink-700',
                ]"
              >
                1°
              </button>
              <button
                @click="depth = 2"
                :class="[
                  'rounded-md px-3 py-1 text-xs font-medium transition',
                  depth === 2 ? 'bg-lapis-500 text-paper-50' : 'text-ink-500 hover:text-ink-700',
                ]"
              >
                2°
              </button>
            </div>
            <button
              @click="$emit('close')"
              aria-label="Close graph"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-paper-200 hover:text-ink-700"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" class="h-5 w-5">
                <line x1="5" y1="5" x2="15" y2="15" />
                <line x1="15" y1="5" x2="5" y2="15" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Graph -->
        <div class="relative overflow-auto bg-paper-100/50" style="max-height: 65vh;">
          <svg
            :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
            class="mx-auto block"
            style="min-width: 500px;"
            role="img"
            aria-label="Entity relationship graph"
          >
            <!-- Edges -->
            <g class="edges">
              <g
                v-for="(edge, i) in visibleEdges"
                :key="i"
                :opacity="hoveredNode && hoveredNode.irdi !== edge.source && hoveredNode.irdi !== edge.target ? 0.15 : 0.5"
              >
                <line
                  :x1="edge.s!.x"
                  :y1="edge.s!.y"
                  :x2="edge.t!.x"
                  :y2="edge.t!.y"
                  :stroke="EDGE_COLORS[edge.kind]"
                  :stroke-width="edge.s!.node.degree === 0 || edge.t!.node.degree === 0 ? 1.5 : 0.8"
                  stroke-linecap="round"
                />
              </g>
            </g>

            <!-- Nodes -->
            <g class="nodes">
              <g
                v-for="pn in positionedNodes"
                :key="pn.node.irdi"
                :transform="`translate(${pn.x}, ${pn.y})`"
                :opacity="hoveredNode && hoveredNode.irdi !== pn.node.irdi && !visibleEdges.some(e => (e.source === hoveredNode!.irdi && e.target === pn.node.irdi) || (e.target === hoveredNode!.irdi && e.source === pn.node.irdi)) ? 0.3 : 1"
                @mouseenter="hoveredNode = pn.node"
                @mouseleave="hoveredNode = null"
                @click="onNodeClick(pn.node)"
                style="cursor: pointer;"
              >
                <!-- Glow ring on hover -->
                <circle
                  v-if="hoveredNode?.irdi === pn.node.irdi"
                  :r="pn.r + 6"
                  fill="none"
                  :stroke="!pn.node.resolved ? 'var(--color-rose-400)' : (TYPE_FILL[pn.node.type] ?? 'var(--color-ink-500)')"
                  stroke-width="1"
                  opacity="0.4"
                />

                <!-- Main circle -->
                <circle
                  :r="pn.r"
                  :fill="!pn.node.resolved ? 'var(--color-rose-400)' : (TYPE_FILL[pn.node.type] ?? 'var(--color-ink-500)')"
                  :stroke="pn.node.degree === 0 ? 'var(--color-paper-50)' : 'none'"
                  :stroke-width="pn.node.degree === 0 ? 3 : 0"
                />

                <!-- Center node label (inside) -->
                <text
                  v-if="pn.node.degree === 0"
                  text-anchor="middle"
                  dy="0.35em"
                  fill="var(--color-paper-50)"
                  font-size="9"
                  font-weight="600"
                >
                  {{ truncate(pn.node.code, 8) }}
                </text>

                <!-- Non-center labels (below) -->
                <text
                  v-else
                  text-anchor="middle"
                  :dy="pn.r + 10"
                  fill="var(--color-ink-700)"
                  font-size="9"
                  font-weight="500"
                >
                  {{ truncate(pn.node.code, 10) }}
                </text>
                <text
                  v-if="pn.node.degree <= 1"
                  text-anchor="middle"
                  :dy="pn.r + 21"
                  fill="var(--color-ink-500)"
                  font-size="8"
                >
                  {{ truncate(pn.node.name, 14) }}
                </text>
              </g>
            </g>
          </svg>
        </div>

        <!-- Legend + Hover detail -->
        <div class="border-t border-paper-200 px-5 py-3">
          <!-- Hovered node detail -->
          <div v-if="hoveredNode" class="mb-2">
            <div class="flex items-center gap-2">
              <span
                class="inline-block h-3 w-3 rounded-full"
                :style="{ background: TYPE_FILL[hoveredNode.type] }"
              />
              <span class="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {{ TYPE_LABEL[hoveredNode.type] }}
              </span>
              <code class="font-mono text-xs text-ink-600">{{ hoveredNode.code }}</code>
              <span v-if="hoveredNode.degree === 0" class="rounded bg-lapis-100 px-1.5 py-0.5 text-[10px] font-semibold text-lapis-700">
                center
              </span>
            </div>
            <p class="mt-0.5 text-sm font-medium text-ink-900">{{ hoveredNode.name }}</p>
            <p v-if="hoveredNode.definition" class="mt-0.5 text-xs text-ink-500">
              {{ hoveredNode.definition }}
            </p>
          </div>

          <!-- Legend -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div
              v-for="(color, type) in TYPE_FILL"
              :key="type"
              class="flex items-center gap-1.5"
            >
              <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: color }" />
              <span class="text-[10px] text-ink-500">{{ TYPE_LABEL[type] }}</span>
            </div>
          </div>

          <p class="mt-2 text-[10px] text-ink-400">
            Click a node to navigate. Press ESC or click outside to close.
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
