<script setup lang="ts">
import { ref, onMounted } from "vue";

interface TocEntry {
  id: string;
  label: string;
}

const entries = ref<TocEntry[]>([]);

onMounted(() => {
  const headings = document.querySelectorAll<HTMLElement>(
    "[data-section-anchor], h2[id]",
  );
  entries.value = Array.from(headings)
    .map((el) => ({
      id: el.id || el.getAttribute("data-section-anchor") || "",
      label: el.textContent?.trim() || "",
    }))
    .filter((e) => e.id && e.label);
});
</script>

<template>
  <details
    v-if="entries.length > 2"
    class="xl:hidden rounded-lg border border-paper-200 bg-paper-50/60 px-3 py-2"
  >
    <summary
      class="cursor-pointer select-none text-xs font-semibold uppercase tracking-[0.08em] text-ink-500 transition hover:text-ink-700"
    >
      On this page ({{ entries.length }})
    </summary>
    <ul class="mt-2 space-y-0.5 border-l border-paper-200 pl-1">
      <li v-for="entry in entries" :key="entry.id">
        <a
          :href="`#${entry.id}`"
          class="block border-l-2 border-transparent py-0.5 pl-3 text-sm text-ink-500 transition hover:border-lapis-400 hover:text-ink-800"
        >
          {{ entry.label }}
        </a>
      </li>
    </ul>
  </details>
</template>
