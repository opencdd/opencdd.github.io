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
const recentEntities = ref<SearchResult[]>([]);

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

const RECENT_KEY = "opencdd:recent-entities";
const RECENT_MAX = 5;

function loadRecent(): SearchResult[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SearchResult[];
  } catch {
    return [];
  }
}

function saveRecent(entry: SearchResult) {
  const existing = loadRecent().filter((r) => r.url !== entry.url);
  existing.unshift(entry);
  const trimmed = existing.slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */
  }
  recentEntities.value = trimmed;
}

function detectIrdi(q: string): string | null {
  const m = q.match(/#([A-Z0-9]+)/);
  if (m) return m[1] ?? null;
  if (/^[A-Z]{3}\d{3,}/.test(q.trim())) return q.trim();
  return null;
}

function isIrdiQuery(q: string): boolean {
  return q.includes("#") || /^\d{4}\/\d/.test(q.trim());
}

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
    const recent = recentEntities.value.map((r, i) => ({
      kind: "entity" as const,
      ...r,
      index: i,
    }));
    const dicts = props.dictionaries.map((d, i) => ({
      kind: "dict" as const,
      ...d,
      index: recent.length + i,
    }));
    return [...recent, ...dicts];
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
  recentEntities.value = loadRecent();
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
    saveRecent({
      url: entry.url,
      title: entry.title,
      excerpt: entry.excerpt,
      dict: entry.dict,
      type: entry.type,
      code: entry.code,
    });
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
    const irdiCode = detectIrdi(q);
    const searchQuery = irdiCode ?? q;
    const search = await pf.search(searchQuery);
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

    if (irdiCode) {
      results.value = results.value.sort((a, b) => {
        const aExact = a.code === irdiCode ? 0 : 1;
        const bExact = b.code === irdiCode ? 0 : 1;
        return aExact - bExact;
      });
    }

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

interface EggResponse {
  icon: string;
  title: string;
  body: string;
  accent: string;
}

const EASTER_EGGS: Array<{ match: RegExp; response: EggResponse }> = [
  {
    match: /^42(\.0*)?$/,
    response: {
      icon: "✦",
      title: "The Answer",
      body: "The answer to the ultimate question of life, the universe, and IRDI resolution.",
      accent: "var(--color-teal-500)",
    },
  },
  {
    match: /^hello$|^hi$|^hey$/i,
    response: {
      icon: "◐",
      title: "Hello, fellow taxonomist",
      body: "Welcome to OpenCDD. Every entity here has a name in six languages and an IRDI older than most web frameworks.",
      accent: "var(--color-emerald-500)",
    },
  },
  {
    match: /^opencdd$/i,
    response: {
      icon: "⬡",
      title: "You found us",
      body: "OpenCDD — a modern browser for published IEC Common Data Dictionary data. Free, open-source, IRDI-native.",
      accent: "var(--color-hex-500)",
    },
  },
  {
    match: /^matrix$/i,
    response: {
      icon: "▦",
      title: "Wake up, taxonomist",
      body: "Type UNIVERSE anywhere on the site. The IRDI rain awaits.",
      accent: "var(--color-lapis-500)",
    },
  },
  {
    match: /^water$|^ripple$/i,
    response: {
      icon: "◉",
      title: "Watershed",
      body: "Click the logo five times. Watch the IRDI codes ripple outward like rain on still water.",
      accent: "var(--color-rose-500)",
    },
  },
  {
    match: /^universe$/i,
    response: {
      icon: "✶",
      title: "0112/2///61360_4#UNIVERSE",
      body: "The virtual root class of every CDD classification tree (IEC 61360 §21.1). Type it anywhere on the site to summon the IRDI rain.",
      accent: "var(--color-teal-600)",
    },
  },
  {
    match: /^konami$/i,
    response: {
      icon: "⌨",
      title: "No Konami here",
      body: "We replaced it. Type UNIVERSE instead — the CDD virtual root, IEC 61360 §21.1. On-brand and discoverable.",
      accent: "var(--color-violet-500)",
    },
  },
  {
    match: /^unicorns?$/i,
    response: {
      icon: "✶",
      title: "No unicorns here",
      body: "Only well-classified electrotechnical entities. But we appreciate the whimsy.",
      accent: "var(--color-hex-400)",
    },
  },
  {
    match: /^iec$/i,
    response: {
      icon: "Ⓔ",
      title: "IEC — International Electrotechnical Commission",
      body: "Source of the CDD. OpenCDD paraphrases and cites; the normative text lives on webstore.iec.ch.",
      accent: "var(--color-teal-600)",
    },
  },
  {
    match: /^irdi$/i,
    response: {
      icon: "⌖",
      title: "IRDI",
      body: "International Registration Data Identifier. ISO/IEC 11179-6. The canonical, language-independent handle for every dictionary entry.",
      accent: "var(--color-lapis-600)",
    },
  },
  {
    match: /^rainbow$/i,
    response: {
      icon: "◈",
      title: "Rainbow mode",
      body: "Click the theme toggle five times, rapidly. Hue will cycle. Tastefulness not guaranteed.",
      accent: "var(--color-rose-400)",
    },
  },
];

function matchEgg(q: string): EggResponse | null {
  const trimmed = q.trim().toLowerCase();
  if (!trimmed) return null;
  for (const egg of EASTER_EGGS) {
    if (egg.match.test(trimmed)) return egg.response;
  }
  return null;
}

const eggResponse = computed(() => matchEgg(query.value));
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

            <!-- Empty search: recently viewed + dictionaries -->
            <div v-else-if="!query.trim()" class="p-2">
              <!-- Recently viewed -->
              <template v-if="recentEntities.length > 0">
                <p class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Recently viewed
                </p>
                <button
                  v-for="entry in recentEntities"
                  :key="'recent-' + entry.url"
                  @click="navigate({ kind: 'entity' as const, ...entry, index: 0 })"
                  @mouseenter="selectedIndex = -1"
                  class="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-paper-100"
                >
                  <span
                    class="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    :style="{ background: TYPE_DOT[entry.type] ?? 'var(--color-ink-400)' }"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-baseline gap-2">
                      <code class="font-mono text-[11px] text-ink-500">{{ entry.code }}</code>
                      <span class="truncate text-sm text-ink-800">{{ entry.title }}</span>
                    </div>
                  </div>
                  <span class="shrink-0 rounded-full bg-paper-100 px-2 py-0.5 text-[10px] font-medium text-ink-500">
                    {{ dictLabel(entry.dict) }}
                  </span>
                </button>
              </template>

              <!-- Dictionaries -->
              <p class="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                Dictionaries
              </p>
              <button
                v-for="entry in props.dictionaries"
                :key="'dict-' + entry.slug"
                @click="navigate({ kind: 'dict' as const, ...entry, index: 0 })"
                @mouseenter="selectedIndex = -1"
                :class="[
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition',
                  'hover:bg-paper-100',
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
              <!-- Easter egg response -->
              <div
                v-if="eggResponse"
                class="mb-2 rounded-xl border px-3 py-2.5"
                :style="{ borderColor: eggResponse.accent, background: `color-mix(in srgb, ${eggResponse.accent} 8%, transparent)` }"
              >
                <div class="flex items-start gap-3">
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                    :style="{ background: `color-mix(in srgb, ${eggResponse.accent} 18%, transparent)`, color: eggResponse.accent }"
                  >
                    {{ eggResponse.icon }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold" :style="{ color: eggResponse.accent }">
                      {{ eggResponse.title }}
                    </p>
                    <p class="mt-0.5 text-xs text-ink-600">{{ eggResponse.body }}</p>
                  </div>
                </div>
              </div>

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
              <template v-if="eggResponse">
                <div
                  class="mx-auto mb-4 max-w-md rounded-xl border px-4 py-3 text-left"
                  :style="{ borderColor: eggResponse.accent, background: `color-mix(in srgb, ${eggResponse.accent} 8%, transparent)` }"
                >
                  <div class="flex items-start gap-3">
                    <span
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
                      :style="{ background: `color-mix(in srgb, ${eggResponse.accent} 18%, transparent)`, color: eggResponse.accent }"
                    >
                      {{ eggResponse.icon }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold" :style="{ color: eggResponse.accent }">
                        {{ eggResponse.title }}
                      </p>
                      <p class="mt-0.5 text-xs text-ink-600">{{ eggResponse.body }}</p>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <p class="text-sm text-ink-500">No matches for "{{ query }}"</p>
                <p class="mt-1 text-xs text-ink-400">Try a different term or code.</p>
              </template>
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
