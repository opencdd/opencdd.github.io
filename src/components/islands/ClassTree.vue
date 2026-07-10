<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";

interface FlatTreeNode {
  readonly irdi: string;
  readonly code: string;
  readonly label: string;
  readonly parentIrdi: string | null;
  readonly depth: number;
  readonly declaredPropertyCount: number;
}

interface Props {
  dict: string;
  initialHighlightedIrdi?: string;
}

const props = defineProps<Props>();

const STORAGE_PREFIX = "opencdd-tree:";

function detectHighlightedCode(initial?: string): string | null {
  if (typeof window === "undefined") return null;
  if (initial) {
    const m = initial.match(/\/c\/([^/]+)\/?$/);
    if (m && m[1]) return m[1];
  }
  return null;
}

function loadExpanded(dict: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + dict);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveExpanded(dict: string, expanded: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_PREFIX + dict,
      JSON.stringify([...expanded]),
    );
  } catch {
    // sessionStorage can be unavailable (private mode) — non-fatal.
  }
}

function ancestorsOf(node: FlatTreeNode, lookup: Map<string, FlatTreeNode>): string[] {
  const out: string[] = [];
  let current: FlatTreeNode | undefined = node;
  while (current?.parentIrdi) {
    out.push(current.parentIrdi);
    current = lookup.get(current.parentIrdi);
  }
  return out;
}

// ── State ────────────────────────────────────────────────────────
const nodes = ref<FlatTreeNode[]>([]);
const loadError = ref<string | null>(null);
const expanded = ref<Set<string>>(loadExpanded(props.dict));
const query = ref("");
const focusIdx = ref(0);

const inputRef = ref<HTMLInputElement | null>(null);
const focusRef = ref<HTMLAnchorElement | null>(null);

// ── Data fetch ───────────────────────────────────────────────────
let cancelled = false;

onMounted(() => {
  loadError.value = null;
  fetch(`${import.meta.env.BASE_URL}d/${props.dict}/tree.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<FlatTreeNode[]>;
    })
    .then((data) => {
      if (!cancelled) nodes.value = data;
    })
    .catch((err: Error) => {
      if (!cancelled) loadError.value = err.message;
    });
});

onUnmounted(() => {
  cancelled = true;
});

// ── Derived ──────────────────────────────────────────────────────
const nodeByIrdi = computed(() => {
  const m = new Map<string, FlatTreeNode>();
  for (const n of nodes.value) m.set(n.irdi, n);
  return m;
});

const highlightedCode = detectHighlightedCode(props.initialHighlightedIrdi);

const highlightedIrdi = computed<string | null>(() => {
  if (!highlightedCode) return null;
  for (const n of nodes.value) {
    if (n.code === highlightedCode) return n.irdi;
  }
  return null;
});

const visible = computed<FlatTreeNode[]>(() => {
  if (query.value.trim().length === 0) {
    const out: FlatTreeNode[] = [];
    const walk = (n: FlatTreeNode) => {
      out.push(n);
      const children = nodes.value.filter((c) => c.parentIrdi === n.irdi);
      if (expanded.value.has(n.irdi)) for (const c of children) walk(c);
    };
    for (const root of nodes.value.filter((n) => n.parentIrdi === null)) walk(root);
    return out;
  }

  const needle = query.value.trim().toLowerCase();
  const matched = nodes.value.filter(
    (n) =>
      n.label.toLowerCase().includes(needle) ||
      n.code.toLowerCase().includes(needle) ||
      n.irdi.toLowerCase().includes(needle),
  );
  const keep = new Set<string>(matched.map((m) => m.irdi));
  for (const m of matched) {
    for (const a of ancestorsOf(m, nodeByIrdi.value)) keep.add(a);
  }
  return nodes.value.filter((n) => keep.has(n.irdi));
});

// ── Effects ──────────────────────────────────────────────────────

// Auto-expand ancestors of highlighted node.
watch(highlightedIrdi, (hirdi) => {
  if (!hirdi) return;
  const node = nodeByIrdi.value.get(hirdi);
  if (!node) return;
  const ancestors = ancestorsOf(node, nodeByIrdi.value);
  if (ancestors.length === 0) return;
  const next = new Set(expanded.value);
  let changed = false;
  for (const a of ancestors) {
    if (!next.has(a)) {
      next.add(a);
      changed = true;
    }
  }
  if (changed) expanded.value = next;
}, { immediate: true });

// Persist expansion to sessionStorage.
watch(expanded, (val) => saveExpanded(props.dict, val), { deep: true });

// ?expand=<code> back-link.
watch(nodes, () => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const expandCode = params.get("expand");
  if (!expandCode) return;
  const target = nodes.value.find((n) => n.code === expandCode);
  if (!target) return;
  const ancestors = ancestorsOf(target, nodeByIrdi.value);
  const next = new Set(expanded.value);
  for (const a of ancestors) next.add(a);
  expanded.value = next;
});

// Scroll focused row into view.
watch(focusIdx, () => {
  nextTick(() => {
    focusRef.value?.scrollIntoView({ block: "nearest" });
  });
});

// ── Actions ──────────────────────────────────────────────────────
function setNodeExpanded(irdi: string, open: boolean): void {
  const next = new Set(expanded.value);
  if (open) next.add(irdi);
  else next.delete(irdi);
  expanded.value = next;
}

function expandAll(): void {
  expanded.value = new Set(nodes.value.map((n) => n.irdi));
}

function collapseAll(): void {
  expanded.value = new Set();
}

function onKeyDown(e: KeyboardEvent): void {
  if (visible.value.length === 0) return;
  const node = visible.value[focusIdx.value];
  if (!node) return;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      focusIdx.value = Math.min(visible.value.length - 1, focusIdx.value + 1);
      break;
    case "ArrowUp":
      e.preventDefault();
      focusIdx.value = Math.max(0, focusIdx.value - 1);
      break;
    case "Home":
      e.preventDefault();
      focusIdx.value = 0;
      break;
    case "End":
      e.preventDefault();
      focusIdx.value = visible.value.length - 1;
      break;
    case "ArrowRight":
      e.preventDefault();
      if (!expanded.value.has(node.irdi)) setNodeExpanded(node.irdi, true);
      break;
    case "ArrowLeft":
      e.preventDefault();
      if (expanded.value.has(node.irdi)) setNodeExpanded(node.irdi, false);
      break;
    case "Enter": {
      e.preventDefault();
      const container = focusRef.value?.closest("ul");
      const link = container?.querySelector<HTMLAnchorElement>(
        `a[data-irdi="${node.irdi}"]`,
      );
      link?.click();
      break;
    }
  }
}

// `/` focuses the filter input.
function onGlobalKeydown(e: KeyboardEvent): void {
  if (e.key !== "/") return;
  const target = e.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  )
    return;
  e.preventDefault();
  inputRef.value?.focus();
}

onMounted(() => {
  window.addEventListener("keydown", onGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
});
</script>

<template>
  <div v-if="loadError" class="px-2 py-4 text-xs text-rose-700">
    Could not load class tree: {{ loadError }}
  </div>

  <div v-else-if="nodes.length === 0" class="space-y-2" aria-busy="true">
    <div class="h-8 rounded bg-sand-200/60 animate-pulse" />
    <div class="h-8 rounded bg-sand-200/60 animate-pulse w-5/6" />
    <div class="h-8 rounded bg-sand-200/60 animate-pulse w-4/6" />
    <div class="h-8 rounded bg-sand-200/60 animate-pulse" />
    <p class="text-xs text-ink-500">Loading class tree…</p>
  </div>

  <div v-else class="flex h-full flex-col">
    <div class="mb-2 flex items-center gap-1.5">
      <input
        ref="inputRef"
        type="search"
        v-model="query"
        placeholder="Filter tree…"
        aria-label="Filter class tree"
        class="w-full rounded-md border border-ink-200 bg-sand-50 px-2.5 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200"
      />
      <button
        type="button"
        @click="expandAll"
        title="Expand all"
        class="rounded-md px-1.5 py-1 text-ink-400 transition hover:bg-sand-100 hover:text-ink-700"
        aria-label="Expand all"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
          <path d="M5 3.25C5 2.56 5.56 2 6.25 2h6.5C13.44 2 14 2.56 14 3.25v6.5c0 .69-.56 1.25-1.25 1.25h-6.5C5.56 11 5 10.44 5 9.75v-6.5Zm-3 3A1.25 1.25 0 0 1 3.25 5h.5a.75.75 0 0 1 0 1.5H3.5v.75a.75.75 0 0 1-1.5 0v-1Z" />
        </svg>
      </button>
      <button
        type="button"
        @click="collapseAll"
        title="Collapse all"
        class="rounded-md px-1.5 py-1 text-ink-400 transition hover:bg-sand-100 hover:text-ink-700"
        aria-label="Collapse all"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
          <path d="M6.25 3a1.25 1.25 0 0 0-1.25 1.25v.5a.75.75 0 0 0 1.5 0v-.25h3.5v3.5h-.25a.75.75 0 0 0 0 1.5h.5A1.25 1.25 0 0 0 12 8.25v-4A1.25 1.25 0 0 0 10.75 3h-4.5Z" />
        </svg>
      </button>
    </div>

    <div class="relative flex-1">
      <p v-if="visible.length === 0" class="px-2 py-4 text-xs text-ink-500">
        No matching classes.
      </p>
      <ul
        v-else
        role="tree"
        :aria-label="`${dict} classes`"
        @keydown="onKeyDown"
        class="text-sm"
      >
        <li
          v-for="(node, i) in visible"
          :key="node.irdi"
          role="treeitem"
          :aria-expanded="nodes.some((c) => c.parentIrdi === node.irdi) ? expanded.has(node.irdi) : undefined"
          :aria-level="node.depth + 1"
          :aria-selected="highlightedIrdi === node.irdi"
          :data-irdi="node.irdi"
          :style="{ paddingLeft: `${node.depth * 0.75 + 0.25}rem` }"
          :class="[
            'flex items-center gap-1 rounded-md py-0.5 pl-1 pr-1',
            highlightedIrdi === node.irdi ? 'bg-accent-50 text-accent-900' : 'hover:bg-sand-100',
            i === focusIdx ? 'ring-2 ring-accent-300 ring-inset' : '',
          ]"
        >
          <button
            v-if="nodes.some((c) => c.parentIrdi === node.irdi)"
            type="button"
            @click.stop="setNodeExpanded(node.irdi, !expanded.has(node.irdi))"
            :aria-label="expanded.has(node.irdi) ? 'Collapse' : 'Expand'"
            class="grid h-4 w-4 shrink-0 place-items-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <svg
              viewBox="0 0 12 12"
              fill="currentColor"
              :class="['h-2.5 w-2.5 transition', expanded.has(node.irdi) ? 'rotate-90' : '']"
              aria-hidden="true"
            >
              <path d="M4.5 2.5 8 6 4.5 9.5z" />
            </svg>
          </button>
          <span v-else class="inline-block h-4 w-4 shrink-0" aria-hidden="true" />

          <a
            :ref="i === focusIdx ? (el: any) => { if (el?.$el) focusRef = el.$el; else if (el) focusRef = el; } : undefined"
            :href="`/d/${dict}/c/${node.code}`"
            :data-irdi="node.irdi"
            :title="`${node.irdi} — ${node.label}`"
            :class="[
              'flex flex-1 items-baseline gap-1.5 truncate py-0.5 pr-1 text-[13px] leading-snug',
              highlightedIrdi === node.irdi ? 'font-medium text-accent-900' : 'text-ink-800',
            ]"
          >
            <span class="shrink-0 font-mono text-[10px] text-ink-400">{{ node.code }}</span>
            <span class="truncate">{{ node.label }}</span>
            <span
              v-if="node.declaredPropertyCount > 0"
              class="ml-auto shrink-0 rounded-full bg-sand-200/60 px-1.5 font-mono text-[10px] text-ink-500"
            >
              {{ node.declaredPropertyCount }}
            </span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>
