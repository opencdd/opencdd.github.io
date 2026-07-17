<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { EntityNode } from "~/lib/types";
import { emitEntityCddal, cddalFileName } from "~/lib/cddalEmitter";
import { emitEntityCsv, csvFileName } from "~/lib/csvEmitter";

interface Props {
  entity: EntityNode;
  /** Public path to the database.json the entity was loaded from,
   *  used for the "raw JSON" download (fallback when blob-emit is
   *  not desirable). */
  dict: string;
}

const props = defineProps<Props>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const jsonPayload = computed(() => JSON.stringify(props.entity, null, 2));
const jsonSize = computed(() => new Blob([jsonPayload.value]).size);
const cddalPayload = computed(() => emitEntityCddal(props.entity));
const cddalSize = computed(() => new Blob([cddalPayload.value]).size);
const csvPayload = computed(() => emitEntityCsv(props.entity));
const csvSize = computed(() => new Blob([csvPayload.value]).size);

const hasRawProperties = computed(
  () =>
    !!props.entity.raw_properties &&
    Object.keys(props.entity.raw_properties).length > 0,
);
const rawCount = computed(() =>
  props.entity.raw_properties ? Object.keys(props.entity.raw_properties).length : 0,
);

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function entityFileName(ext: string): string {
  const base = props.entity.code ?? "entity";
  return `${base}.${ext}`;
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on next tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJson(): void {
  triggerDownload(
    jsonPayload.value,
    entityFileName("json"),
    "application/json",
  );
  open.value = false;
}

function downloadCddal(): void {
  triggerDownload(
    cddalPayload.value,
    cddalFileName(props.entity),
    "text/plain;charset=utf-8",
  );
  open.value = false;
}

function downloadCsv(): void {
  triggerDownload(
    csvPayload.value,
    csvFileName(props.entity),
    "text/csv;charset=utf-8",
  );
  open.value = false;
}

function cddUrl(): string {
  if (!props.entity.irdi) return "https://cdd.iec.ch/";
  return `https://cdd.iec.ch/cdd/iec61360/iec61360.nsf/TreeTreeReadForm?OpenForm&restricttocategory=${encodeURIComponent(
    props.entity.irdi,
  )}`;
}

function onDocClick(e: MouseEvent): void {
  if (!rootRef.value) return;
  if (!rootRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape" && open.value) {
    open.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", onDocClick, true);
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocClick, true);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div ref="rootRef" class="relative inline-block print:hidden">
    <button
      type="button"
      @click="open = !open"
      :aria-expanded="open"
      aria-haspopup="menu"
      class="inline-flex items-center gap-1 rounded-md border border-hex-300 bg-hex-50 px-2.5 py-1 text-[12px] font-medium text-hex-700 shadow-xs transition hover:border-hex-400 hover:bg-hex-100 hover:text-hex-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hex-600"
    >
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        class="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path
          d="M8 1a.75.75 0 0 1 .75.75v6.94l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V1.75A.75.75 0 0 1 8 1Z"
        />
        <path
          d="M2.75 11.5a.75.75 0 0 1 .75.75v.5c0 .14.11.25.25.25h8.5a.25.25 0 0 0 .25-.25v-.5a.75.75 0 0 1 1.5 0v.5a1.75 1.75 0 0 1-1.75 1.75h-8.5A1.75 1.75 0 0 1 2 12.75v-.5a.75.75 0 0 1 .75-.75Z"
        />
      </svg>
      <span>Download</span>
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        class="h-3 w-3 transition-transform"
        :class="open ? 'rotate-180' : ''"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        role="menu"
        aria-label="Download this entity"
        class="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-xl border border-paper-300 bg-paper-50 p-1.5 shadow-lg"
      >
        <div class="px-2 pb-1.5 pt-1">
          <p class="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            Specimen envelope
          </p>
          <p class="mt-0.5 text-[11px] text-ink-500">
            Take this entity with you · pick a format
          </p>
        </div>

        <button
          type="button"
          role="menuitem"
          data-variant="json"
          class="envelope-tab w-full text-left"
          @click="downloadJson"
        >
          <span class="envelope-icon mt-0.5" aria-hidden="true">
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              class="h-4 w-4"
            >
              <path
                d="M5.75 1A2.75 2.75 0 0 0 3 3.75v8.5A2.75 2.75 0 0 0 5.75 15h4.5A2.75 2.75 0 0 0 13 12.25v-7a.75.75 0 0 0-.22-.53l-3.5-3.5A.75.75 0 0 0 8.75 1h-3Zm3.25 1.5 2 2h-1.5a.5.5 0 0 1-.5-.5v-1.5Z"
              />
            </svg>
          </span>
          <span class="flex-1 min-w-0">
            <span class="flex items-baseline justify-between gap-2">
              <span class="text-[13px] font-semibold text-ink-800">JSON</span>
              <span class="font-mono text-[10px] text-ink-500">{{
                formatBytes(jsonSize)
              }}</span>
            </span>
            <span class="mt-0.5 block text-[11px] leading-snug text-ink-600">
              Full entity payload — parsed fields, raw properties, version history.
              <code class="text-ink-700">{{ entityFileName("json") }}</code>
            </span>
          </span>
        </button>

        <button
          type="button"
          role="menuitem"
          data-variant="cddal"
          class="envelope-tab w-full text-left"
          @click="downloadCddal"
        >
          <span class="envelope-icon mt-0.5" aria-hidden="true">
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              class="h-4 w-4"
            >
              <path
                d="M3 2.75A1.75 1.75 0 0 1 4.75 1h6.5A1.75 1.75 0 0 1 13 2.75v10.5A1.75 1.75 0 0 1 11.25 15h-6.5A1.75 1.75 0 0 1 3 13.25V2.75Zm3.25 2.5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Zm-.75 3.25a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Zm.75 1.75a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"
              />
            </svg>
          </span>
          <span class="flex-1 min-w-0">
            <span class="flex items-baseline justify-between gap-2">
              <span class="text-[13px] font-semibold text-ink-800">CDDAL</span>
              <span class="font-mono text-[10px] text-ink-500">{{
                formatBytes(cddalSize)
              }}</span>
            </span>
            <span class="mt-0.5 block text-[11px] leading-snug text-ink-600">
              Canonical text format (IEC 62656-1). Round-trips with the
              <code class="text-ink-700">opencdd</code> Ruby gem.
            </span>
          </span>
        </button>

        <a
          role="menuitem"
          data-variant="xls"
          :href="cddUrl()"
          target="_blank"
          rel="noreferrer noopener"
          class="envelope-tab no-underline"
          @click="open = false"
        >
          <span class="envelope-icon mt-0.5" aria-hidden="true">
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              class="h-4 w-4"
            >
              <path
                d="M4.75 1A1.75 1.75 0 0 0 3 2.75v10.5c0 .966.784 1.75 1.75 1.75h6.5A1.75 1.75 0 0 0 13 13.25v-7.5a.75.75 0 0 0-.22-.53l-3.25-3.25A.75.75 0 0 0 8.78 1.5H4.75Zm5 1.94 2.06 2.06H10.5a.75.75 0 0 1-.75-.75V2.94Z"
              />
              <path
                d="M5.5 8.75a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5Zm.5 1.75a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3Z"
                opacity="0.7"
              />
            </svg>
          </span>
          <span class="flex-1 min-w-0">
            <span class="flex items-baseline justify-between gap-2">
              <span class="text-[13px] font-semibold text-ink-800">
                Source XLS
                <span class="ml-1 text-[10px] uppercase tracking-wide text-ink-400">external</span>
              </span>
              <span v-if="hasRawProperties" class="font-mono text-[10px] text-ink-500">
                {{ rawCount }} keys
              </span>
            </span>
            <span class="mt-0.5 block text-[11px] leading-snug text-ink-600">
              Original <code>.xls</code> exports from
              <code class="text-ink-700">cdd.iec.ch</code>. Opens the source
              page in a new tab.
            </span>
          </span>
        </a>

        <button
          type="button"
          role="menuitem"
          data-variant="cddal"
          class="envelope-tab w-full text-left"
          @click="downloadCsv"
        >
          <span class="envelope-icon mt-0.5" aria-hidden="true">
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              class="h-4 w-4"
            >
              <path
                fill-rule="evenodd"
                d="M2 3.75A1.75 1.75 0 0 1 3.75 2h8.5A1.75 1.75 0 0 1 14 3.75v8.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5Zm2.5.25a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7Zm-.5 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Zm.5 1.75a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7Zm-.5 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5Z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
          <span class="flex-1 min-w-0">
            <span class="flex items-baseline justify-between gap-2">
              <span class="text-[13px] font-semibold text-ink-800">CSV</span>
              <span class="font-mono text-[10px] text-ink-500">{{
                formatBytes(csvSize)
              }}</span>
            </span>
            <span class="mt-0.5 block text-[11px] leading-snug text-ink-600">
              One row per <code>(property_id, language)</code>. Best for
              spreadsheets (Excel, Numbers, Google Sheets).
            </span>
          </span>
        </button>

        <div class="mt-1.5 border-t border-paper-200 px-2 py-1.5">
          <p class="text-[10px] leading-snug text-ink-500">
            Tip: CDDAL is human-readable and diffs cleanly in git.
            JSON is the full wire payload — best for tooling.
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>
