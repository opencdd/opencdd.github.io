<script setup lang="ts">
import { ref, onMounted } from "vue";

const STORAGE_KEY = "opencdd-lang";
const KNOWN_LANGS = ["en", "de", "fr", "zh"] as const;

const current = ref<string>("en");
const available = ref<string[]>(["en"]);

function detectAvailable(): string[] {
  if (typeof document === "undefined") return ["en"];
  const set = new Set<string>();
  document.querySelectorAll<HTMLElement>("[class*='ml-']").forEach((el) => {
    for (const cls of el.classList) {
      const m = cls.match(/^ml-([a-z]{2}(-[a-z0-9]+)?)$/i);
      if (m && m[1]) set.add(m[1]);
    }
  });
  const sorted = KNOWN_LANGS.filter((l) => set.has(l));
  set.forEach((l) => {
    if (!sorted.includes(l)) sorted.push(l);
  });
  return sorted.length > 0 ? sorted : ["en"];
}

function apply(lang: string): void {
  current.value = lang;
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-lang", lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage can be unavailable — non-fatal
  }
  document.querySelectorAll<HTMLElement>("[class*='ml-']").forEach((el) => {
    const match = el.className.match(/ml-([a-z]{2}(-[a-z0-9]+)?)/i);
    const spanLang = match?.[1] ?? "en";
    el.setAttribute("aria-hidden", spanLang !== lang ? "true" : "false");
  });
}

onMounted(() => {
  available.value = detectAvailable();
  let saved = "en";
  try {
    saved = localStorage.getItem(STORAGE_KEY) || "en";
  } catch {
    // localStorage can be unavailable — default en
  }
  apply(saved);
});
</script>

<template>
  <div
    class="flex items-center gap-0.5 rounded-md border border-ink-200 bg-sand-50 p-0.5 print:hidden"
    role="group"
    aria-label="Language"
  >
    <button
      v-for="lang in available"
      :key="lang"
      type="button"
      @click="apply(lang)"
      :class="[
        'rounded px-1.5 py-0.5 text-[11px] font-medium uppercase transition',
        current === lang
          ? 'bg-accent-600 text-white'
          : 'text-ink-500 hover:bg-sand-100 hover:text-ink-800',
      ]"
      :aria-pressed="current === lang"
    >
      {{ lang }}
    </button>
  </div>
</template>
