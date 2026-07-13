<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const visible = ref(false);

function onScroll() {
  visible.value = window.scrollY > window.innerHeight * 1.5;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
});
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <button
      v-if="visible"
      @click="scrollToTop"
      aria-label="Back to top"
      class="fixed bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-paper-300 bg-paper-50 shadow-md transition hover:border-lapis-400 hover:bg-paper-100 hover:shadow-lg print:hidden"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-ink-600">
        <path d="M10 16V4M5 9l5-5 5 5" />
      </svg>
    </button>
  </Transition>
</template>
