<script setup lang="ts">
import { computed } from "vue";
import { useFilter } from "~/composables/useFilter";
import FilterBar from "./FilterBar.vue";

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
  collapsable?: boolean;
  label?: string;
  empty?: string;
}>();

const { query, filtered } = useFilter(
  computed(() => props.items),
  (item) => [item.code, item.name, item.definition ?? ""],
);

const showSearch = computed(() => props.items.length > 6 && !props.collapsable);
</script>

<template>
  <component :is="collapsable ? 'details' : 'div'">
    <summary
      v-if="collapsable"
      class="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.08em] text-ink-500 transition hover:text-lapis-700"
    >
      {{ label ?? "Properties" }} ({{ items.length }}) — click to expand
    </summary>

    <div :class="collapsable ? 'mt-3' : ''">
      <div v-if="items.length === 0 && empty" class="text-sm text-ink-400">
        {{ empty }}
      </div>
      <template v-else>
        <FilterBar
          v-if="showSearch"
          v-model="query"
          :filtered="filtered.length"
          :total="items.length"
          placeholder="Filter by name, code, or definition…"
          aria-label="Filter properties"
        />

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
      </template>
    </div>
  </component>
</template>
