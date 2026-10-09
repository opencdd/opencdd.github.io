<script setup lang="ts">
import { ref, computed } from "vue";
import MapBrowser from "./MapBrowser.vue";
import { useFilter } from "~/composables/useFilter";
import FilterBar from "./FilterBar.vue";

export interface FacetItem {
  code: string;
  name: string;
  href: string;
  definition: string | null;
  facets: Record<string, string | null>;
  lat?: number;
  lon?: number;
}

export interface FacetConfig {
  key: string;
  label: string;
  /** Options shown at once (default 12). Country needs room for the
   * full registry breadth. */
  max?: number;
}

/** Per facet key → per raw value: localized labels (language → text,
 * rendered as ml spans so the CSS language switch applies) and an
 * optional link to the value's entity page. */
export interface FacetValueMeta {
  ml?: Record<string, string>;
  href?: string;
}

const props = defineProps<{
  items: FacetItem[];
  facets: FacetConfig[];
  title: string;
  facetValueMeta?: Record<string, Record<string, FacetValueMeta>>;
}>();

const { query, filtered: textFiltered } = useFilter(
  computed(() => props.items),
  (item) => [item.code, item.name, item.definition ?? ""],
);

const activeFacets = ref<Record<string, string>>({});

const facetOptions = computed(() => {
  const out: Record<
    string,
    Array<{ value: string; label: string; count: number; ml?: Record<string, string>; href?: string }>
  > = {};
  for (const fc of props.facets) {
    const counts = new Map<string, number>();
    for (const item of props.items) {
      const val = item.facets[fc.key];
      if (val) counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    const meta = props.facetValueMeta?.[fc.key];
    out[fc.key] = Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        label: value,
        count,
        ml: meta?.[value]?.ml,
        href: meta?.[value]?.href,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, fc.max ?? 12);
  }
  return out;
});

const filtered = computed(() => {
  const activeKeys = Object.keys(activeFacets.value);
  if (activeKeys.length === 0) return textFiltered.value;
  return textFiltered.value.filter((item) =>
    activeKeys.every((key) => item.facets[key] === activeFacets.value[key]),
  );
});

const mappedItems = computed(() =>
  textFiltered.value
    .filter((item) => typeof item.lat === "number" && typeof item.lon === "number")
    .slice(0, 1200)
    .map((item) => ({ ...item, lat: item.lat!, lon: item.lon! })),
);

const PAGE_SIZE = 50;
const visibleCount = ref(PAGE_SIZE);
const visibleItems = computed(() => filtered.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < filtered.value.length);

function toggleFacet(key: string, value: string) {
  if (activeFacets.value[key] === value) {
    delete activeFacets.value[key];
    activeFacets.value = { ...activeFacets.value };
  } else {
    activeFacets.value = { ...activeFacets.value, [key]: value };
  }
  visibleCount.value = PAGE_SIZE;
}

function showMore() {
  visibleCount.value += PAGE_SIZE;
}
</script>

<template>
  <div>
    <!-- Facet chips -->
    <div v-if="facets.length > 0" class="mb-4 space-y-2">
      <div v-for="fc in facets" :key="fc.key" class="flex flex-wrap items-center gap-1.5">
        <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{{ fc.label }}:</span>
        <span
          v-for="opt in facetOptions[fc.key]"
          :key="opt.value"
          class="inline-flex items-center overflow-hidden rounded-full bg-paper-100"
        >
          <button
            @click="toggleFacet(fc.key, opt.value)"
            :class="[
              'px-2.5 py-0.5 text-xs font-medium transition',
              activeFacets[fc.key] === opt.value
                ? 'bg-lapis-500 text-paper-50'
                : 'text-ink-600 hover:bg-paper-200',
            ]"
          >
            <template v-if="opt.ml">
              <span v-for="(txt, lang) in opt.ml" :key="lang" :class="`ml ml-${lang}`">{{ txt }}</span>
            </template>
            <template v-else>{{ opt.label }}</template>
            <span class="ml-1 font-mono text-[10px] opacity-60">{{ opt.count }}</span>
          </button>
          <a
            v-if="opt.href"
            :href="opt.href"
            class="px-1.5 py-0.5 text-[10px] text-ink-400 transition hover:text-lapis-700"
            :title="`Open the ${fc.label.toLowerCase()} page`"
            aria-label="Open the entity page for this facet value"
          >↗</a>
        </span>
      </div>
    </div>

    <!-- Search bar -->
    <FilterBar
      v-model="query"
      :filtered="filtered.length"
      :total="items.length"
      :placeholder="`Filter ${title}…`"
    />

    <MapBrowser :items="mappedItems" />

    <!-- Results -->
    <p v-if="filtered.length === 0" class="py-8 text-center text-sm text-ink-500">
      No matches.
    </p>

    <ul v-else class="grid gap-1.5 sm:grid-cols-2">
      <li v-for="item in visibleItems" :key="item.code">
        <a
          :href="item.href"
          class="group flex items-center gap-2.5 rounded-lg border border-paper-200 bg-paper-50 px-3 py-2 transition hover:border-lapis-300 hover:bg-lapis-50/30 hover:shadow-xs"
        >
          <code class="shrink-0 rounded bg-paper-100 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-ink-500 transition group-hover:bg-lapis-100 group-hover:text-lapis-700">
            {{ item.code }}
          </code>
          <span class="min-w-0 flex-1 truncate text-sm text-ink-800 transition group-hover:text-lapis-700">
            {{ item.name }}
          </span>
        </a>
      </li>
    </ul>

    <div v-if="hasMore" class="mt-4 flex justify-center">
      <button
        type="button"
        @click="showMore"
        class="rounded-lg border border-paper-300 bg-paper-50 px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-paper-400 hover:bg-paper-100"
      >
        Show more ({{ filtered.length - visibleCount }} remaining)
      </button>
    </div>
  </div>
</template>
