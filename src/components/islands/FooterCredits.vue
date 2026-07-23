<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const REQUIRED_TAPS = 7;
const TAP_WINDOW_MS = 2500;

const showCredits = ref(false);
const tapCount = ref(0);
let taps: number[] = [];
let resetTimer: ReturnType<typeof setTimeout> | undefined;
let autoHideTimer: ReturnType<typeof setTimeout> | undefined;

const CREDITS = [
  { label: "Built with", value: "Astro 7 · Vue 3 · Tailwind 4 · Pagefind" },
  { label: "Data layer", value: "opencdd-ruby · @opencdd/models" },
  { label: "Inspired by", value: "ISO/IEC 11179 · IEC 61360 · IEC 62656" },
  { label: "Made for", value: "taxonomists, engineers, and the merely curious" },
  { label: "Fuelled by", value: "tea, topology, and well-classified things" },
];

const SIGNATURES = [
  "0112/2///61360_4#UNIVERSE",
  "the data wants to be browsed",
  "⌖ every entity has a story",
  "common ground, preserved differences",
];

const signature = ref(SIGNATURES[0]);

function onTap() {
  const now = Date.now();
  taps = taps.filter((t) => now - t < TAP_WINDOW_MS);
  taps.push(now);
  tapCount.value = taps.length;

  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    taps = [];
    tapCount.value = 0;
  }, TAP_WINDOW_MS + 500);

  if (taps.length >= REQUIRED_TAPS && !showCredits.value) {
    taps = [];
    tapCount.value = 0;
    signature.value = SIGNATURES[Math.floor(Math.random() * SIGNATURES.length)]!;
    showCredits.value = true;
    if (autoHideTimer) clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(() => {
      showCredits.value = false;
    }, 12000);
  }
}

onUnmounted(() => {
  if (resetTimer) clearTimeout(resetTimer);
  if (autoHideTimer) clearTimeout(autoHideTimer);
});

const year = new Date().getFullYear();
</script>

<template>
  <div class="w-full">
    <div class="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        @click="onTap"
        class="cursor-pointer select-none text-xs text-ink-400 transition hover:text-ink-600 focus:outline-none focus-visible:text-ink-600"
        :title="tapCount > 0 && tapCount < REQUIRED_TAPS ? `${REQUIRED_TAPS - tapCount} more…` : '© OpenCDD'"
      >
        © {{ year }} OpenCDD contributors. Dictionary content © IEC, Geneva.
        <span
          v-if="tapCount > 0 && tapCount < REQUIRED_TAPS"
          class="ml-1 inline-block h-1 w-1 animate-pulse rounded-full bg-teal-500 align-middle"
          aria-hidden="true"
        />
      </button>
      <p class="text-[10px] text-ink-300">{{ signature }}</p>
    </div>

    <Transition
      enter-active-class="transition duration-500 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="showCredits"
        class="mt-6 overflow-hidden rounded-xl border border-teal-300/60 bg-gradient-to-br from-teal-50 to-lapis-50 p-5 shadow-sm"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="font-display text-sm font-semibold text-teal-800">
              ✦ You found the hidden credits
            </p>
            <p class="mt-0.5 text-[11px] text-ink-500">
              Tap the copyright line {{ REQUIRED_TAPS }} times to summon this panel.
            </p>
          </div>
          <button
            type="button"
            @click="showCredits = false"
            class="rounded-md p-1 text-ink-400 transition hover:bg-paper-200 hover:text-ink-700"
            aria-label="Dismiss credits"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>
        <dl class="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
          <div v-for="credit in CREDITS" :key="credit.label" class="flex flex-col">
            <dt class="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              {{ credit.label }}
            </dt>
            <dd class="mt-0.5 text-ink-700">{{ credit.value }}</dd>
          </div>
        </dl>
        <p class="mt-4 border-t border-teal-200/60 pt-3 text-[11px] italic text-teal-700">
          "Common ground, preserved differences." — the OpenCDD spirit
        </p>
      </div>
    </Transition>
  </div>
</template>
