<script setup lang="ts">
import { computed } from "vue";
import { useFilter } from "~/composables/useFilter";
import FilterBar from "./FilterBar.vue";

export interface EntityListItem {
  code: string;
  name: string;
  href: string | null;
  resolved: boolean;
}

const props = defineProps<{
  items: EntityListItem[];
  placeholder?: string;
  empty?: string;
}>();

const { query, filtered } = useFilter(
  computed(() => props.items),
  (item) => [item.code, item.name],
);

const showSearch = computed(() => props.items.length > 6);
</script>

<template>
  <div>
    <div v-if="items.length === 0 && empty" class="text-sm text-ink-400">
      {{ empty }}
    </div>
    <template v-else>
      <FilterBar
        v-if="showSearch"
        v-model="query"
        :filtered="filtered.length"
        :total="items.length"
        :placeholder="placeholder"
      />

      <p v-if="filtered.length === 0" class="py-4 text-center text-sm text-ink-500">
        No matches for "{{ query }}"
      </p>

      <ul v-else class="grid gap-1.5 sm:grid-cols-2">
        <li v-for="item in filtered" :key="item.code">
          <a
            v-if="item.href"
            :href="item.href"
            class="group flex items-center gap-2.5 rounded-lg border border-paper-200 bg-paper-50 px-3 py-2 transition hover:border-lapis-300 hover:bg-lapis-50/30 hover:shadow-xs"
          >
            <code
              class="shrink-0 rounded bg-paper-100 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-ink-500 transition group-hover:bg-lapis-100 group-hover:text-lapis-700"
            >
              {{ item.code }}
            </code>
            <span
              class="min-w-0 flex-1 truncate text-sm text-ink-800 transition group-hover:text-lapis-700"
            >
              {{ item.name }}
            </span>
          </a>
          <span
            v-else
            class="flex items-center gap-2.5 rounded-lg border border-rose-300 bg-rose-50/60 px-3 py-2"
            title="Entity not in browser data — referenced but not scraped"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden="true">
              <path d="M6 3L3 3a1 1 0 0 0-1 1v3M10 3h3a1 1 0 0 1 1 1v3M6 13H3a1 1 0 0 1-1-1V9M10 13h3a1 1 0 0 0 1-1V9" stroke-linecap="round"/>
              <line x1="2" y1="2" x2="14" y2="14" stroke-linecap="round"/>
            </svg>
            <code
              class="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-rose-700 line-through decoration-rose-300"
            >
              {{ item.code }}
            </code>
            <span class="min-w-0 flex-1 truncate text-sm font-medium text-rose-600">
              Not in data
            </span>
          </span>
        </li>
      </ul>
    </template>
  </div>
</template>
