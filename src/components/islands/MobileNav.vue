<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { primaryNav } from "~/lib/siteNav";

const open = ref(false);
const current = ref<string>("");

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

onMounted(() => {
  current.value = window.location.pathname;
  document.addEventListener("keydown", onKey);
  document.addEventListener("astro:after-swap", () => {
    current.value = window.location.pathname;
    close();
  });
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKey);
});

watch(open, (val) => {
  document.body.style.overflow = val ? "hidden" : "";
});

function isActive(href: string): boolean {
  if (href === "/") return current.value === "/" || current.value === "";
  return current.value === href || current.value.startsWith(href + "/");
}
</script>

<template>
  <div class="md:hidden">
    <button
      type="button"
      @click="toggle"
      :aria-expanded="open"
      aria-controls="mobile-nav-menu"
      aria-label="Toggle navigation menu"
      class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-paper-300 bg-paper-50 text-ink-700 transition hover:border-paper-400 hover:bg-paper-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hex-600"
    >
      <svg
        v-if="!open"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        aria-hidden="true"
        class="h-5 w-5"
      >
        <line x1="3" y1="6" x2="17" y2="6" />
        <line x1="3" y1="10" x2="17" y2="10" />
        <line x1="3" y1="14" x2="17" y2="14" />
      </svg>
      <svg
        v-else
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        aria-hidden="true"
        class="h-5 w-5"
      >
        <line x1="5" y1="5" x2="15" y2="15" />
        <line x1="15" y1="5" x2="5" y2="15" />
      </svg>
    </button>

    <Teleport to="body">
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-40 bg-ink-900/20 backdrop-blur-sm md:hidden"
          @click="close"
          aria-hidden="true"
        />
      </transition>

      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-[-100%]"
        enter-to-class="translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-[-100%]"
      >
        <nav
          v-if="open"
          id="mobile-nav-menu"
          class="fixed inset-x-0 top-0 z-50 origin-top bg-paper-50 shadow-lg md:hidden"
          aria-label="Mobile primary"
        >
          <div class="flex items-center justify-between border-b border-paper-300 px-4 py-3">
            <div class="flex items-center gap-2.5">
              <img
                src="/img/logo-64.png"
                alt=""
                aria-hidden="true"
                width="28"
                height="28"
                class="h-7 w-7 rounded-md"
              />
              <span class="font-display text-base font-medium text-ink-900">OpenCDD</span>
            </div>
            <button
              type="button"
              @click="close"
              aria-label="Close menu"
              class="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-700 transition hover:bg-paper-200"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                aria-hidden="true"
                class="h-5 w-5"
              >
                <line x1="5" y1="5" x2="15" y2="15" />
                <line x1="15" y1="5" x2="5" y2="15" />
              </svg>
            </button>
          </div>

          <ul class="px-2 py-2">
            <li v-for="item in primaryNav" :key="item.href">
              <a
                :href="item.href"
                :class="[
                  'block rounded-md px-3 py-3 text-base transition',
                  isActive(item.href)
                    ? 'bg-paper-200/70 font-medium text-ink-900'
                    : 'text-ink-700 hover:bg-paper-200/50 hover:text-ink-900',
                ]"
              >
                {{ item.label }}
              </a>
            </li>
          </ul>

          <div class="border-t border-paper-300 px-4 py-3">
            <a
              href="/search"
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-paper-300 bg-paper-50 px-3 py-2 text-sm text-ink-700 transition hover:border-paper-400"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.39 9.83l3.39 3.39a.75.75 0 1 0 1.06-1.06l-3.39-3.39A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" />
              </svg>
              <span>Search</span>
            </a>
          </div>
        </nav>
      </transition>
    </Teleport>
  </div>
</template>
