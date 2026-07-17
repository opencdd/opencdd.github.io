<script setup lang="ts">
import { ref, onMounted } from "vue";

type Theme = "auto" | "light" | "dark";
const theme = ref<Theme>("auto");

const icons = {
  auto: `<circle cx="10" cy="10" r="4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/>`,
  light: `<circle cx="10" cy="10" r="3.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/>`,
  dark: `<path d="M14 11.5A5.5 5.5 0 0 1 8.5 6a5.5 5.5 0 0 0 5.5 5.5ZM10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z"/>`,
};

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "auto") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = t;
  }
  try { localStorage.setItem("opencdd:theme", t); } catch { /* ignore */ }
  theme.value = t;
}

function cycle() {
  const order: Theme[] = ["auto", "light", "dark"];
  const idx = order.indexOf(theme.value);
  applyTheme(order[(idx + 1) % order.length]!);
}

onMounted(() => {
  try {
    theme.value = (localStorage.getItem("opencdd:theme") as Theme) || "auto";
  } catch { /* ignore */
  }
});
</script>

<template>
  <button
    type="button"
    @click="cycle"
    :aria-label="`Theme: ${theme}`"
    class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-paper-200 hover:text-ink-700 print:hidden"
    :title="`Theme: ${theme} (click to change)`"
  >
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      class="h-4 w-4"
      v-html="icons[theme]"
    />
  </button>
</template>
