<script setup lang="ts">
defineProps<{
  modelValue: string;
  filtered: number;
  total: number;
  placeholder?: string;
  ariaLabel?: string;
}>();

defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div class="mb-3 flex items-center gap-2">
    <div class="relative flex-1">
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M9 3.5a5.5 5.5 0 1 0 3.39 9.83l3.39 3.39a.75.75 0 1 0 1.06-1.06l-3.39-3.39A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
        />
      </svg>
      <input
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        type="search"
        :placeholder="placeholder ?? 'Filter…'"
        :aria-label="ariaLabel ?? 'Filter list'"
        class="w-full rounded-md border border-paper-300 bg-paper-50 py-1.5 pl-8 pr-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-lapis-500 focus:bg-paper-100 focus:outline-none focus:ring-2 focus:ring-lapis-200"
      />
    </div>
    <span class="shrink-0 text-xs tabular-nums text-ink-500">
      {{ filtered }} / {{ total }}
    </span>
  </div>
</template>
