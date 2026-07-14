<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const progress = ref(0);

function onScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  progress.value = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
}

onMounted(() => {
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
});
</script>

<template>
  <div
    class="fixed left-0 top-0 z-40 h-0.5 w-full bg-transparent pointer-events-none print:hidden"
    aria-hidden="true"
  >
    <div
      class="h-full bg-gradient-to-r from-teal-500 to-lapis-500 transition-[width] duration-75 ease-out"
      :style="{ width: `${progress * 100}%` }"
    ></div>
  </div>
</template>
