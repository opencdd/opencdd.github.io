<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  entityDiff,
  diffSummary,
  diffIsEmpty,
  type EntityLike,
  type EntityDiffResult,
} from "~/lib/entityDiff";

interface Props {
  /** The "from" entity (typically older version). */
  from: EntityLike | null;
  /** The "to" entity (typically newer / current). */
  to: EntityLike | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const mode = ref<"unified" | "split">("unified");

const diff = computed<EntityDiffResult | null>(() => {
  if (!props.from || !props.to) return null;
  return entityDiff(props.from, props.to);
});

const summary = computed(() => (diff.value ? diffSummary(diff.value) : ""));
const empty = computed(() => (diff.value ? diffIsEmpty(diff.value) : true));

function fieldKey(field: string, suffix: string): string {
  return `${field}-${suffix}`;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}
</script>

<template>
  <div
    v-if="diff"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/40 p-4 print:hidden"
    role="dialog"
    aria-modal="true"
    aria-label="Version diff"
    @click.self="emit('close')"
  >
    <div class="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-xl border border-paper-300 bg-paper-50 shadow-2xl">
      <header class="flex items-baseline justify-between border-b border-paper-200 px-5 py-3">
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            Version diff
          </p>
          <h2 class="mt-0.5 font-display text-lg text-ink-900">
            <code class="font-mono text-sm">{{ diff.irdi ?? "—" }}</code>
          </h2>
          <p class="mt-1 font-mono text-[11px] text-ink-500">{{ summary }}</p>
        </div>
        <div class="flex items-center gap-2">
          <div
            class="inline-flex overflow-hidden rounded-md border border-paper-300 text-[11px]"
            role="tablist"
            aria-label="Diff mode"
          >
            <button
              type="button"
              :class="[
                'px-2 py-0.5 font-medium transition',
                mode === 'unified' ? 'bg-hex-100 text-hex-800' : 'bg-paper-50 text-ink-600 hover:bg-paper-100'
              ]"
              role="tab"
              aria-selected="mode === 'unified'"
              @click="mode = 'unified'"
            >Unified</button>
            <button
              type="button"
              :class="[
                'px-2 py-0.5 font-medium transition',
                mode === 'split' ? 'bg-hex-100 text-hex-800' : 'bg-paper-50 text-ink-600 hover:bg-paper-100'
              ]"
              role="tab"
              aria-selected="mode === 'split'"
              @click="mode = 'split'"
            >Split</button>
          </div>
          <button
            type="button"
            class="rounded-md p-1 text-ink-500 transition hover:bg-paper-100 hover:text-ink-800"
            aria-label="Close diff"
            @click="emit('close')"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" class="h-4 w-4" aria-hidden="true">
              <path d="M3.78 3.78a.75.75 0 0 1 1.06 0L8 6.94l3.16-3.16a.75.75 0 1 1 1.06 1.06L9.06 8l3.16 3.16a.75.75 0 1 1-1.06 1.06L8 9.06l-3.16 3.16a.75.75 0 0 1-1.06-1.06L6.94 8 3.78 4.84a.75.75 0 0 1 0-1.06Z"/>
            </svg>
          </button>
        </div>
      </header>

      <div class="max-h-[calc(88vh-7rem)] overflow-y-auto px-5 py-4 scroll-thin">
        <p v-if="empty" class="py-6 text-center text-sm text-ink-500 italic">
          No field-level differences between these versions.
        </p>

        <template v-else>
          <!-- Added fields -->
          <section v-if="diff.added.length" class="mb-5">
            <h3 class="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Added ({{ diff.added.length }})
            </h3>
            <ul class="space-y-0.5 font-mono text-[12px]">
              <li
                v-for="field in diff.added"
                :key="fieldKey(field, 'add')"
                class="flex gap-3 rounded bg-emerald-50/50 px-2 py-1"
              >
                <span class="text-emerald-700">+</span>
                <code class="text-ink-700">{{ field }}</code>
              </li>
            </ul>
          </section>

          <!-- Removed fields -->
          <section v-if="diff.removed.length" class="mb-5">
            <h3 class="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-700">
              <span class="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
              Removed ({{ diff.removed.length }})
            </h3>
            <ul class="space-y-0.5 font-mono text-[12px]">
              <li
                v-for="field in diff.removed"
                :key="fieldKey(field, 'rm')"
                class="flex gap-3 rounded bg-rose-50/50 px-2 py-1"
              >
                <span class="text-rose-700">−</span>
                <code class="text-ink-700">{{ field }}</code>
              </li>
            </ul>
          </section>

          <!-- Changed fields -->
          <section v-if="diff.changed.length">
            <h3 class="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700">
              <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              Changed ({{ diff.changed.length }})
            </h3>

            <template v-if="mode === 'unified'">
              <ul class="space-y-1.5 font-mono text-[12px]">
                <li
                  v-for="change in diff.changed"
                  :key="fieldKey(change.field, 'ch')"
                  class="rounded border border-amber-200 bg-amber-50/30 px-2 py-1.5"
                >
                  <div class="text-ink-800">{{ change.field }}</div>
                  <div class="mt-1 flex gap-2">
                    <span class="flex-1 text-rose-700 line-through opacity-70">
                      {{ formatValue(change.from) }}
                    </span>
                    <span class="text-ink-400">→</span>
                    <span class="flex-1 text-emerald-700">
                      {{ formatValue(change.to) }}
                    </span>
                  </div>
                </li>
              </ul>
            </template>

            <template v-else>
              <table class="w-full border-collapse font-mono text-[12px]">
                <thead>
                  <tr class="border-b border-paper-200 text-left text-[10px] uppercase tracking-wide text-ink-500">
                    <th class="py-1 pr-3 font-medium">Field</th>
                    <th class="py-1 pr-3 font-medium text-rose-700">From</th>
                    <th class="py-1 font-medium text-emerald-700">To</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="change in diff.changed"
                    :key="fieldKey(change.field, 'split')"
                    class="border-b border-paper-100 align-top"
                  >
                    <td class="py-1.5 pr-3 text-ink-700">{{ change.field }}</td>
                    <td class="py-1.5 pr-3 text-rose-700">{{ formatValue(change.from) }}</td>
                    <td class="py-1.5 text-emerald-700">{{ formatValue(change.to) }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>
