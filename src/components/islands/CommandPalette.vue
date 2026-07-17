<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";

export interface DictShortcut {
  slug: string;
  title: string;
  entityCount: number;
}

const props = defineProps<{
  dictionaries: DictShortcut[];
}>();

const open = ref(false);
const query = ref("");
const loading = ref(false);
const results = ref<SearchResult[]>([]);
const selectedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

interface SearchResult {
  url: string;
  title: string;
  excerpt: string;
  dict: string;
  type: string;
  code: string;
}

let pagefind: any = null;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const TYPE_DOT: Record<string, string> = {
  class: "var(--color-teal-500)",
  property: "var(--color-emerald-500)",
  unit: "var(--color-rose-500)",
  value_list: "var(--color-hex-500)",
  value_term: "var(--color-hex-400)",
  relation: "var(--color-violet-500)",
};

const TYPE_LABEL: Record<string, string> = {
  class: "Class",
  property: "Property",
  unit: "Unit",
  value_list: "Value List",
  value_term: "Term",
  relation: "Relation",
};

const flatResults = computed(() => {
  if (!query.value.trim()) {
    return props.dictionaries.map((d, i) => ({
      kind: "dict" as const,
      ...d,
      index: i,
    }));
  }
  return results.value.map((r, i) => ({
    kind: "entity" as const,
    ...r,
    index: i,
  }));
});

function openPalette() {
  open.value = true;
  loading.value = false;
  results.value = [];
  query.value = "";
  selectedIndex.value = 0;
  nextTick(() => inputRef.value?.focus());
  document.body.style.overflow = "hidden";
}

function closePalette() {
  open.value = false;
  document.body.style.overflow = "";
}

function navigate(entry: (typeof flatResults.value)[0]) {
  if (!entry) return;
  if (entry.kind === "dict") {
    window.location.href = `/d/${entry.slug}/`;
  } else {
    window.location.href = entry.url;
  }
}

async function ensurePagefind() {
  if (pagefind) return pagefind;
  try {
    pagefind = await import(/* @vite-ignore */ "/pagefind/pagefind.js");
    await pagefind.init();
  } catch {
    pagefind = null;
  }
  return pagefind;
}

async function doSearch(q: string) {
  const pf = await ensurePagefind();
  if (!pf) return;

  loading.value = true;
  try {
    const search = await pf.search(q);
    const top = search.results.slice(0, 15);
    const dataPromises = top.map((r: any) => r.data());
    const dataList = await Promise.all(dataPromises);
    results.value = dataList
      .filter((d: any) => d?.url?.startsWith("/d/"))
      .map((d: any) => {
        const m = d.url.match(/^\/d\/([^/]+)\/([a-z])\/([^/]+)/);
        const typeCode = m?.[2];
        const typeMap: Record<string, string> = {
          c: "class", p: "property", u: "unit",
          v: "value_list", t: "value_term", r: "relation",
        };
        return {
          url: d.url,
          title: d.meta?.title || d.url,
          excerpt: (d.excerpt || "").replace(/<[^>]*>/g, "").slice(0, 120),
          dict: m?.[1] ?? "",
          type: typeMap[typeCode ?? ""] ?? "",
          code: m?.[3] ?? "",
        };
      });
    selectedIndex.value = 0;
  } finally {
    loading.value = false;
  }
}

watch(query, (q) => {
  if (searchTimer) clearTimeout(searchTimer);
  if (!q.trim()) {
    results.value = [];
    loading.value = false;
    return;
  }
  loading.value = true;
  searchTimer = setTimeout(() => doSearch(q), 180);
});

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return;
  const entries = flatResults.value;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % Math.max(entries.length, 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value - 1 + entries.length) % Math.max(entries.length, 1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    navigate(entries[selectedIndex.value]);
  } else if (e.key === "Escape") {
    e.preventDefault();
    closePalette();
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    if (open.value) closePalette();
    else openPalette();
  }
}

onMounted(() => {
  document.addEventListener("keydown", onGlobalKeydown);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("opencdd:open-palette", openPalette);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onGlobalKeydown);
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("opencdd:open-palette", openPalette);
  document.body.style.overflow = "";
});

function dictLabel(slug: string): string {
  return props.dictionaries.find((d) => d.slug === slug)?.title ?? slug;
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-ink-950/50 backdrop-blur-sm"
        @click.self="closePalette"
      >
        <div
          class="w-full max-w-2xl overflow-hidden rounded-2xl border border-paper-300 bg-paper-50 shadow-2xl"
        >
          <!-- Search input -->
          <div class="flex items-center gap-3 border-b border-paper-200 px-4 py-3">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              class="h-5 w-5 shrink-0 text-ink-400"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 3.39 9.83l3.39 3.39a.75.75 0 1 0 1.06-1.06l-3.39-3.39A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
              />
            </svg>
            <input
              ref="inputRef"
              v-model="query"
              type="search"
              placeholder="Search entities across all dictionaries, or pick a dictionary below…"
              aria-label="Command palette search"
              class="flex-1 bg-transparent text-base text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
            <kbd
              class="shrink-0 rounded border border-paper-300 bg-paper-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-500"
            >
              ESC
            </kbd>
          </div>

          <!-- Results -->
          <div class="max-h-[55vh] overflow-y-auto scroll-thin">
            <!-- Loading -->
            <div v-if="loading" class="px-4 py-8 text-center text-sm text-ink-400">
              <div class="inline-flex items-center gap-2">
                <div class="h-3 w-3 animate-spin rounded-full border-2 border-lapis-400 border-t-transparent"></div>
                Searching…
              </div>
            </div>

            <!-- Empty search: dictionary shortcuts -->
            <div v-else-if="!query.trim()" class="p-2">
              <p class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                Dictionaries
              </p>
              <button
                v-for="entry in flatResults"
                :key="entry.slug"
                @click="navigate(entry)"
                @mouseenter="selectedIndex = entry.index"
                :class="[
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition',
                  selectedIndex === entry.index ? 'bg-lapis-50' : 'hover:bg-paper-100',
                ]"
              >
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-lapis-400 text-xs font-bold text-paper-50">
                  {{ entry.title.charAt(0) }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-ink-900">{{ entry.title }}</p>
                  <p class="truncate text-xs text-ink-500">{{ entry.slug }}</p>
                </div>
                <span class="shrink-0 font-mono text-[11px] text-ink-400">
                  {{ entry.entityCount.toLocaleString() }}
                </span>
              </button>
            </div>

            <!-- Search results -->
            <div v-else-if="flatResults.length > 0" class="p-2">
              <p class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                {{ flatResults.length }} result{{ flatResults.length !== 1 ? 's' : '' }}
              </p>
              <button
                v-for="entry in flatResults"
                :key="entry.url"
                @click="navigate(entry)"
                @mouseenter="selectedIndex = entry.index"
                :class="[
                  'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition',
                  selectedIndex === entry.index ? 'bg-lapis-50' : 'hover:bg-paper-100',
                ]"
              >
                <span
                  class="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  :style="{ background: TYPE_DOT[entry.type] ?? 'var(--color-ink-400)' }"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-2">
                    <code class="font-mono text-[11px] text-ink-500">{{ entry.code }}</code>
                    <span class="truncate text-sm font-medium text-ink-900">{{ entry.title }}</span>
                  </div>
                  <p v-if="entry.excerpt" class="mt-0.5 line-clamp-1 text-xs text-ink-500">
                    {{ entry.excerpt }}
                  </p>
                </div>
                <span class="shrink-0 rounded-full bg-paper-100 px-2 py-0.5 text-[10px] font-medium text-ink-500">
                  {{ dictLabel(entry.dict) }}
                </span>
              </button>
            </div>

            <!-- No results -->
            <div v-else class="px-4 py-12 text-center">
              <p class="text-sm text-ink-500">No matches for "{{ query }}"</p>
              <p class="mt-1 text-xs text-ink-400">Try a different term or code.</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-paper-200 px-4 py-2 text-[10px] text-ink-400">
            <div class="flex items-center gap-3">
              <span><kbd class="rounded bg-paper-100 px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
              <span><kbd class="rounded bg-paper-100 px-1 py-0.5 font-mono">↵</kbd> open</span>
              <span><kbd class="rounded bg-paper-100 px-1 py-0.5 font-mono">esc</kbd> close</span>
            </div>
            <span>Powered by Pagefind</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
