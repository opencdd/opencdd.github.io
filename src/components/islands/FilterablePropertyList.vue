<script setup lang="ts">
import { ref, computed } from "vue";

export interface PropertyListItem {
  code: string;
  name: string;
  href: string;
  definition: string | null;
  dataTypeLabel: string | null;
  unitName: string | null;
  unitHref: string | null;
}

const props = defineProps<{
  items: PropertyListItem[];
}>();

const query = ref("");
const q = computed(() => query.value.trim().toLowerCase());

const filtered = computed(() => {
  if (!q.value) return props.items;
  return props.items.filter(
    (item) =>
      item.code.toLowerCase().includes(q.value) ||
      item.name.toLowerCase().includes(q.value) ||
      (item.definition?.toLowerCase().includes(q.value) ?? false),
  );
});
</script>

<template>
  <div>
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
          placeholder="Filter by name, code, or definition…"
          aria-label="Filter properties"
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

    <div v-else class="divide-y divide-paper-200">
      <article
        v-for="item in filtered"
        :key="item.code"
        class="group py-3 first:pt-0 last:pb-0"
      >
        <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <code
            class="shrink-0 rounded bg-paper-100 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-ink-500 transition group-hover:bg-lapis-50 group-hover:text-lapis-700"
          >
            {{ item.code }}
          </code>
          <a
            :href="item.href"
            class="font-medium text-ink-900 underline decoration-dotted underline-offset-2 transition hover:text-lapis-700 hover:decoration-solid"
          >
            {{ item.name }}
          </a>
          <span
            v-if="item.dataTypeLabel || item.unitName"
            class="ml-auto flex flex-wrap items-center gap-1.5 text-[11px]"
          >
            <span
              v-if="item.dataTypeLabel"
              class="rounded-full bg-paper-100 px-2 py-0.5 font-mono text-[10px] text-ink-600"
            >
              {{ item.dataTypeLabel }}
            </span>
            <a
              v-if="item.unitName && item.unitHref"
              :href="item.unitHref"
              class="inline-flex items-center gap-1 rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700 transition hover:bg-teal-100"
            >
              {{ item.unitName }}
            </a>
            <span
              v-else-if="item.unitName"
              class="inline-flex items-center gap-1 rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] text-teal-700"
            >
              {{ item.unitName }}
            </span>
          </span>
        </div>
        <p
          v-if="item.definition"
          class="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-600"
        >
          {{ item.definition }}
        </p>
      </article>
    </div>
  </div>
</template>
