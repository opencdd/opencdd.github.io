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
            class="flex items-center gap-2.5 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2"
          >
            <code
              class="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-amber-700"
            >
              {{ item.code }}
            </code>
            <span class="min-w-0 flex-1 truncate text-sm italic text-ink-500">
              record not scraped
            </span>
          </span>
        </li>
      </ul>
    </template>
  </div>
</template>
