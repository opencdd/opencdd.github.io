<script setup lang="ts">
import { ref, onUnmounted } from "vue";

interface Props {
  value: string;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: "Copy",
});

const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

async function onClick(): Promise<void> {
  if (!navigator.clipboard?.writeText) return;
  try {
    await navigator.clipboard.writeText(props.value);
    copied.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (copied.value = false), 1600);
  } catch {
    // clipboard API can fail in non-secure contexts; silently no-op
  }
}

onUnmounted(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <button
    type="button"
    @click="onClick"
    :data-copy-state="copied ? 'copied' : 'idle'"
    :aria-label="copied ? `Copied: ${value}` : label"
    class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition print:hidden"
    :class="copied
      ? 'bg-emerald-50 text-emerald-700'
      : 'text-ink-400 hover:bg-sand-100 hover:text-ink-700'"
  >
    <span v-if="copied">
      <svg viewBox="0 0 16 16" fill="currentColor" class="h-3 w-3" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M13.48 3.84a.75.75 0 0 1-.02 1.06l-6.75 6.5a.75.75 0 0 1-1.04 0L2.5 8.36a.75.75 0 1 1 1.04-1.08l2.65 2.56 6.23-5.98a.75.75 0 0 1 1.06.02Z"
          clip-rule="evenodd"
        />
      </svg>
      <span aria-live="polite">Copied</span>
    </span>
    <span v-else>
      <svg viewBox="0 0 16 16" fill="currentColor" class="h-3 w-3" aria-hidden="true">
        <path
          d="M4 2.75A1.75 1.75 0 0 1 5.75 1h5.5A1.75 1.75 0 0 1 13 2.75v8.5A1.75 1.75 0 0 1 11.25 13h-1.5v-1.5h1.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25h-5.5a.25.25 0 0 0-.25.25v1.5H4v-1.5Z"
        />
        <path
          d="M2 5.75A1.75 1.75 0 0 1 3.75 4h4.5A1.75 1.75 0 0 1 10 5.75v7.5A1.75 1.75 0 0 1 8.25 15h-4.5A1.75 1.75 0 0 1 2 13.25v-7.5Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .14.11.25.25.25h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-4.5Z"
        />
      </svg>
      <span class="sr-only">{{ label }}</span>
    </span>
  </button>
</template>
