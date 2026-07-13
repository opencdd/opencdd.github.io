<script setup lang="ts">
import { ref, computed } from "vue";

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

const query = ref("");
const q = computed(() => query.value.trim().toLowerCase());

const filtered = computed(() => {
  if (!q.value) return props.items;
  return props.items.filter(
    (item) =>
      item.code.toLowerCase().includes(q.value) ||
      item.name.toLowerCase().includes(q.value),
  );
});
</script>

<template>
  <div>
    <div v-if="items.length === 0 && empty" class="text-sm text-ink-400">
      {{ empty }}
    </div>
    <template v-else>
      <div v-if="items.length > 6" class="mb-3 flex items-center gap-2">
        <div class="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.39 9.83l3.39 3.39a.75.75 0 1 0 1.06-1.06l-3.39-3.39A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
            />
          </svg>
          <input
            v-model="query"
            type="search"
            :placeholder="placeholder ?? 'Filter…'"
            aria-label="Filter list"
            class="w-full rounded-md border border-paper-300 bg-paper-50 py-1.5 pl-8 pr-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-lapis-500 focus:bg-paper-100 focus:outline-none focus:ring-2 focus:ring-lapis-200"
          />
        </div>
        <span class="shrink-0 text-xs tabular-nums text-ink-500">
          {{ filtered.length }} / {{ items.length }}
        </span>
      </div>

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
