<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";

interface TocEntry {
  id: string;
  label: string;
  level: number;
}

const entries = ref<TocEntry[]>([]);
const activeId = ref<string | null>(null);
let observer: IntersectionObserver | null = null;

function collectEntries(): TocEntry[] {
  if (typeof document === "undefined") return [];
  const headings = document.querySelectorAll<HTMLElement>(
    "[data-section-anchor], h2[id], h3[id]",
  );
  return Array.from(headings).map((el) => {
    const id = el.id || el.getAttribute("data-section-anchor") || "";
    const text = el.textContent?.trim() || id;
    const level = el.tagName === "H3" ? 2 : 1;
    return { id, label: text, level };
  });
}

onMounted(async () => {
  await nextTick();
  entries.value = collectEntries();
  if (entries.value.length === 0) return;

  observer = new IntersectionObserver(
    (records) => {
      for (const r of records) {
        if (r.isIntersecting) {
          activeId.value = r.target.id;
        }
      }
    },
    {
      rootMargin: "-80px 0px -70% 0px",
      threshold: 0,
    },
  );

  for (const e of entries.value) {
    const el = document.getElementById(e.id);
    if (el) observer.observe(el);
  }
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<template>
  <nav
    v-if="entries.length > 0"
    aria-label="On this page"
    class="hidden lg:block rounded-lg border border-ink-200 bg-sand-50/50 px-3 py-2 text-sm"
  >
    <p class="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">
      On this page
    </p>
    <ul class="space-y-0.5 border-l border-ink-200">
      <li v-for="entry in entries" :key="entry.id">
        <a
          :href="`#${entry.id}`"
          :class="[
            'block border-l-2 -ml-px py-0.5 transition',
            entry.level === 2 ? 'pl-4' : 'pl-3',
            activeId === entry.id
              ? 'border-accent-600 font-medium text-accent-700'
              : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800',
          ]"
        >
          {{ entry.label }}
        </a>
      </li>
    </ul>
  </nav>
</template>
