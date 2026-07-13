<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useFilter } from "~/composables/useFilter";
import FilterBar from "./FilterBar.vue";
import type { EntityType } from "~/lib/types";

export interface EntityTabItem {
  code: string;
  name: string;
  href: string;
}

export interface EntityTab {
  type: EntityType;
  label: string;
  count: number;
  items: EntityTabItem[];
  totalCount: number;
}

const props = defineProps<{
  tabs: EntityTab[];
  initialTab?: string;
}>();

const firstType = computed(() => props.tabs[0]?.type ?? "class");
const activeType = ref(
  (props.initialTab && props.tabs.some((t) => t.type === props.initialTab)
    ? props.initialTab
    : firstType.value) as EntityType,
);

const activeTab = computed(
  () => props.tabs.find((t) => t.type === activeType.value) ?? props.tabs[0],
);

const isCapped = computed(
  () => (activeTab.value?.totalCount ?? 0) > (activeTab.value?.items.length ?? 0),
);

const sortBy = ref<"code" | "name">("code");

const sortedItems = computed(() => {
  const items = [...(activeTab.value?.items ?? [])];
  items.sort((a, b) =>
    sortBy.value === "name"
      ? a.name.localeCompare(b.name)
      : a.code.localeCompare(b.code),
  );
  return items;
});

const { query, filtered } = useFilter(sortedItems, (item) => [
  item.code,
  item.name,
]);

const PAGE_SIZE = 50;
const visibleCount = ref(PAGE_SIZE);
const visibleItems = computed(() => filtered.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < filtered.value.length);

const tabRefs = ref<HTMLElement[]>([]);

function setTabRef(el: any, idx: number) {
  if (el) tabRefs.value[idx] = el;
}

function switchTab(type: EntityType) {
  if (activeType.value === type) return;
  activeType.value = type;
  visibleCount.value = PAGE_SIZE;
  query.value = "";
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", type);
    window.history.replaceState({}, "", url);
  }
}

function showMore() {
  visibleCount.value += PAGE_SIZE;
}

function onTabKeydown(event: KeyboardEvent, idx: number) {
  const tabCount = props.tabs.length;
  let newIdx: number | null = null;

  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      newIdx = (idx + 1) % tabCount;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      newIdx = (idx - 1 + tabCount) % tabCount;
      break;
    case "Home":
      newIdx = 0;
      break;
    case "End":
      newIdx = tabCount - 1;
      break;
  }

  if (newIdx !== null) {
    event.preventDefault();
    const targetTab = props.tabs[newIdx];
    if (targetTab) {
      switchTab(targetTab.type);
      nextTick(() => tabRefs.value[newIdx!]?.focus());
    }
  }
}
</script>

<template>
  <div>
    <div class="border-b border-ink-200">
      <nav
        role="tablist"
        aria-label="Entity types"
        class="flex flex-wrap gap-1"
      >
        <button
          v-for="(tab, idx) in tabs"
          :key="tab.type"
          :ref="(el) => setTabRef(el, idx)"
          role="tab"
          :id="`tab-${tab.type}`"
          :aria-selected="tab.type === activeType"
          :aria-controls="`panel-${tab.type}`"
          :tabindex="tab.type === activeType ? 0 : -1"
          @click="switchTab(tab.type)"
          @keydown="onTabKeydown($event, idx)"
          :class="[
            '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition',
            tab.type === activeType
              ? 'border-lapis-500 text-lapis-700'
              : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700',
          ]"
        >
          {{ tab.label }}
          <span class="ml-1 font-mono text-[10px] text-ink-500">{{ tab.count }}</span>
        </button>
      </nav>
    </div>

    <div
      role="tabpanel"
      :id="`panel-${activeType}`"
      :aria-labelledby="`tab-${activeType}`"
      class="mt-4"
    >
      <div
        v-if="isCapped"
        class="mb-3 rounded-lg border border-lapis-200 bg-lapis-50/40 px-4 py-2 text-xs text-ink-600"
      >
        Showing the first {{ activeTab?.items.length.toLocaleString() }} of
        {{ activeTab?.totalCount.toLocaleString() }}.
        <a href="/search" class="font-medium text-lapis-700 underline decoration-dotted underline-offset-2">
          Use search →
        </a>
      </div>

      <div class="mb-3 flex items-center gap-2">
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
            :placeholder="`Filter ${activeTab?.label ?? ''}…`"
            :aria-label="`Filter ${activeTab?.label ?? 'entities'}`"
            class="w-full rounded-md border border-paper-300 bg-paper-50 py-1.5 pl-8 pr-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-lapis-500 focus:bg-paper-100 focus:outline-none focus:ring-2 focus:ring-lapis-200"
          />
        </div>
        <span class="shrink-0 text-xs tabular-nums text-ink-500">
          {{ filtered.length }} / {{ activeTab?.items.length ?? 0 }}
        </span>
        <select
          v-model="sortBy"
          aria-label="Sort by"
          class="shrink-0 rounded-md border border-paper-300 bg-paper-50 px-2 py-1.5 text-xs text-ink-700 focus:border-lapis-500 focus:outline-none focus:ring-2 focus:ring-lapis-200"
        >
          <option value="code">Sort: Code</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <p v-if="filtered.length === 0" class="py-8 text-center text-sm text-ink-500">
        No matches for "{{ query }}"
      </p>

      <ul v-else class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="item in visibleItems" :key="item.code">
          <a
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
        </li>
      </ul>

      <div v-if="hasMore" class="mt-4 flex justify-center">
        <button
          type="button"
          @click="showMore"
          class="rounded-lg border border-paper-300 bg-paper-50 px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-paper-400 hover:bg-paper-100"
        >
          Show {{ Math.min(PAGE_SIZE, filtered.length - visibleCount) }} more
          ({{ filtered.length - visibleCount }} remaining)
        </button>
      </div>
    </div>
  </div>
</template>
