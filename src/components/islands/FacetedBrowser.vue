<script setup lang="ts">
import { ref, computed } from "vue";
import { useFilter } from "~/composables/useFilter";
import FilterBar from "./FilterBar.vue";

export interface FacetItem {
  code: string;
  name: string;
  href: string;
  definition: string | null;
  facets: Record<string, string | null>;
}

export interface FacetConfig {
  key: string;
  label: string;
}

const props = defineProps<{
  items: FacetItem[];
  facets: FacetConfig[];
  title: string;
}>();

const { query, filtered: textFiltered } = useFilter(
  computed(() => props.items),
  (item) => [item.code, item.name, item.definition ?? ""],
);

const activeFacets = ref<Record<string, string>>({});

const facetOptions = computed(() => {
  const out: Record<string, Array<{ value: string; label: string; count: number }>> = {};
  for (const fc of props.facets) {
    const counts = new Map<string, number>();
    for (const item of props.items) {
      const val = item.facets[fc.key];
      if (val) counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    out[fc.key] = Array.from(counts.entries())
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
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
        <button
          v-for="opt in facetOptions[fc.key]"
          :key="opt.value"
          @click="toggleFacet(fc.key, opt.value)"
          :class="[
            'rounded-full px-2.5 py-0.5 text-xs font-medium transition',
            activeFacets[fc.key] === opt.value
              ? 'bg-lapis-500 text-paper-50'
              : 'bg-paper-100 text-ink-600 hover:bg-paper-200',
          ]"
        >
          {{ opt.label }}
          <span class="ml-1 font-mono text-[10px] opacity-60">{{ opt.count }}</span>
        </button>
      </div>
    </div>

    <!-- Search bar -->
    <FilterBar
      v-model="query"
      :filtered="filtered.length"
      :total="items.length"
      :placeholder="`Filter ${title}…`"
    />

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
