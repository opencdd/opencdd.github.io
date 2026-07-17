<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const open = ref(false);

const shortcuts = [
  { keys: ["⌘", "K"], label: "Open command palette / search", section: "Global" },
  { keys: ["?"], label: "Show this shortcuts overlay", section: "Global" },
  { keys: ["Esc"], label: "Close overlay / dialog", section: "Global" },
  { keys: ["↑", "↓"], label: "Navigate results (in palette)", section: "Command palette" },
  { keys: ["↵"], label: "Open selected result", section: "Command palette" },
  { keys: ["1°", "2°"], label: "Toggle graph depth (in graph view)", section: "Graph" },
  { keys: ["Click"], label: "Navigate to entity (in graph)", section: "Graph" },
  { keys: ["Hover"], label: "Preview entity definition (on any link)", section: "Entity links" },
];

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  const isTyping =
    target?.tagName === "INPUT" ||
    target?.tagName === "TEXTAREA" ||
    target?.isContentEditable;

  if (e.key === "?" && !isTyping) {
    e.preventDefault();
    open.value = !open.value;
  } else if (e.key === "Escape" && open.value) {
    open.value = false;
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});

function close() {
  open.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="w-full max-w-lg overflow-hidden rounded-2xl border border-paper-300 bg-paper-50 shadow-2xl">
          <div class="flex items-center justify-between border-b border-paper-200 px-5 py-3">
            <h2 class="font-display text-lg tracking-tight text-ink-900">Keyboard shortcuts</h2>
            <button
              @click="close"
              aria-label="Close"
              class="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition hover:bg-paper-200 hover:text-ink-700"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" class="h-4 w-4">
                <line x1="5" y1="5" x2="15" y2="15" />
                <line x1="15" y1="5" x2="5" y2="15" />
              </svg>
            </button>
          </div>

          <div class="max-h-[60vh] overflow-y-auto scroll-thin p-2">
            <template v-for="(s, i) in shortcuts" :key="i">
              <p
                v-if="i === 0 || shortcuts[i]!.section !== shortcuts[i - 1]!.section"
                class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400"
              >
                {{ s.section }}
              </p>
              <div class="flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-paper-100">
                <span class="text-sm text-ink-700">{{ s.label }}</span>
                <div class="flex items-center gap-1">
                  <kbd
                    v-for="(key, ki) in s.keys"
                    :key="ki"
                    class="rounded border border-paper-300 bg-paper-100 px-1.5 py-0.5 font-mono text-[10px] text-ink-600"
                  >
                    {{ key }}
                  </kbd>
                </div>
              </div>
            </template>
          </div>

          <div class="border-t border-paper-200 px-5 py-2.5 text-center text-[11px] text-ink-400">
            Press <kbd class="rounded bg-paper-100 px-1 py-0.5 font-mono">?</kbd> or <kbd class="rounded bg-paper-100 px-1 py-0.5 font-mono">Esc</kbd> to close
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
