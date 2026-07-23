<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

type Theme = "auto" | "light" | "dark" | "rainbow";
const theme = ref<Theme>("auto");

const icons = {
  auto: `<circle cx="10" cy="10" r="4"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/>`,
  light: `<circle cx="10" cy="10" r="3.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/>`,
  dark: `<path d="M14 11.5A5.5 5.5 0 0 1 8.5 6a5.5 5.5 0 0 0 5.5 5.5ZM10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z"/>`,
  rainbow: `<path d="M2 14a8 8 0 0 1 16 0"/><path d="M4.5 14a5.5 5.5 0 0 1 11 0"/><path d="M7 14a3 3 0 0 1 6 0"/>`,
};

const RAPID_TAPS = 5;
const RAPID_WINDOW_MS = 2000;
let tapTimes: number[] = [];
let rainbowHue = 0;
let rainbowRAF = 0;

function applyBaseTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "auto") {
    delete root.dataset.theme;
  } else if (t === "rainbow") {
    root.dataset.theme = prefersDark() ? "dark" : "light";
  } else {
    root.dataset.theme = t;
  }
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function startRainbow() {
  if (rainbowRAF) return;
  const root = document.documentElement;
  root.dataset.rainbow = "on";
  const tick = () => {
    rainbowHue = (rainbowHue + 0.4) % 360;
    root.style.setProperty("--rainbow-hue", String(rainbowHue));
    rainbowRAF = requestAnimationFrame(tick);
  };
  tick();
}

function stopRainbow() {
  if (rainbowRAF) {
    cancelAnimationFrame(rainbowRAF);
    rainbowRAF = 0;
  }
  const root = document.documentElement;
  root.style.removeProperty("--rainbow-hue");
  delete root.dataset.rainbow;
}

function persist(t: Theme) {
  try { localStorage.setItem("opencdd:theme", t); } catch { /* ignore */ }
  theme.value = t;
}

function applyTheme(t: Theme) {
  applyBaseTheme(t);
  if (t === "rainbow") startRainbow();
  else stopRainbow();
  persist(t);
}

function cycle() {
  const now = Date.now();
  tapTimes = tapTimes.filter((t) => now - t < RAPID_WINDOW_MS);
  tapTimes.push(now);

  if (tapTimes.length >= RAPID_TAPS && theme.value !== "rainbow") {
    tapTimes = [];
    applyTheme("rainbow");
    return;
  }

  if (theme.value === "rainbow") {
    applyTheme("auto");
    tapTimes = [];
    return;
  }

  const order: Theme[] = ["auto", "light", "dark"];
  const idx = order.indexOf(theme.value);
  applyTheme(order[(idx + 1) % order.length]!);
}

onMounted(() => {
  try {
    const stored = (localStorage.getItem("opencdd:theme") as Theme) || "auto";
    applyTheme(stored);
  } catch { /* ignore */
  }
});

onUnmounted(() => {
  stopRainbow();
});
</script>

<template>
  <button
    type="button"
    @click="cycle"
    :aria-label="`Theme: ${theme}`"
    class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-paper-200 hover:text-ink-700 print:hidden"
    :class="theme === 'rainbow' ? 'animate-pulse' : ''"
    :title="theme === 'rainbow' ? 'Theme: rainbow ✦ (click to exit)' : `Theme: ${theme} (click to change)`"
  >
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      :stroke-width="theme === 'rainbow' ? 1.8 : 1.4"
      stroke-linecap="round"
      class="h-4 w-4"
      :style="theme === 'rainbow' ? { color: `hsl(var(--rainbow-hue, 200), 80%, 55%)`, transition: 'color 0.2s' } : {}"
      v-html="icons[theme]"
    />
  </button>
</template>
