<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import type { VersionHistoryEntry } from "~/lib/types";
import VersionDiff from "~/components/islands/VersionDiff.vue";
import type { EntityLike } from "~/lib/entityDiff";

interface Props {
  entries: VersionHistoryEntry[];
  /** Entity IRDI, used to construct cdd.iec.ch source links. */
  irdi: string;
  /** Entity code, used in the source-page link. */
  code: string;
  /** Dictionary slug, for context in labels. */
  dict: string;
}

const props = withDefaults(defineProps<Props>(), {});

const expanded = ref<string | null>(null);
const viewingVersion = ref<string | null>(null);
const viewingMetaOnly = ref(false);
const viewingLabel = ref<string>("");
const diffOpen = ref(false);
const diffFromEntity = ref<EntityLike | null>(null);
const diffToEntity = ref<EntityLike | null>(null);
const activeIdx = ref(0);
const rootRef = ref<HTMLElement | null>(null);

const sorted = computed<VersionHistoryEntry[]>(() =>
  [...props.entries].sort((a, b) => {
    // Current first, then reverse-chronological.
    if (a.is_current && !b.is_current) return -1;
    if (!a.is_current && b.is_current) return 1;
    return (b.timestamp ?? "").localeCompare(a.timestamp ?? "");
  }),
);

const multiVersion = computed(() => sorted.value.length > 1);

function statusTone(status?: string): string {
  if (!status) return "neutral";
  const s = status.toLowerCase();
  if (s === "standard" || s === "published") return "standard";
  if (s === "draft" || s === "proposed") return "draft";
  if (s === "superseded" || s === "replaced" || s === "withdrawn")
    return "superseded";
  return "neutral";
}

function formatDate(s?: string): { date: string; time: string } {
  if (!s) return { date: "—", time: "" };
  // Input format: "2023-08-30 15:40:33" (assumed UTC per cdd.iec.ch convention).
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return { date: s, time: "" };
  const [, y, mo, d, h, mi] = m;
  const monthAbbr = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][parseInt(mo, 10) - 1];
  return {
    date: `${d} ${monthAbbr} ${y}`,
    time: `${h}:${mi} UTC`,
  };
}

function cddUrl(): string {
  if (!props.irdi) return "https://cdd.iec.ch/";
  return `https://cdd.iec.ch/cdd/iec61360/iec61360.nsf/TreeTreeReadForm?OpenForm&restricttocategory=${encodeURIComponent(
    props.irdi,
  )}`;
}

function toggle(entry: VersionHistoryEntry): void {
  const key = entry.unid ?? `${entry.version}-${entry.timestamp}`;
  expanded.value = expanded.value === key ? null : key;
}

function isExpanded(entry: VersionHistoryEntry): boolean {
  const key = entry.unid ?? `${entry.version}-${entry.timestamp}`;
  return expanded.value === key;
}

function versionJsonUrl(entry: VersionHistoryEntry): string {
  if (!entry.unid) return "";
  return `/d/${props.dict}/versions/${props.code}/${entry.unid}.json`;
}

async function viewVersion(entry: VersionHistoryEntry): Promise<void> {
  if (!entry.unid) return;
  const url = versionJsonUrl(entry);
  if (!url) return;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) {
      announceError(`Version ${entry.version} not available (${res.status}).`);
      return;
    }
    const payload: VersionPayload = await res.json();
    viewingVersion.value = entry.unid;
    viewingMetaOnly.value = !!payload.version_meta_only;
    viewingLabel.value = `v${entry.version ?? "?"} · ${formatDate(entry.timestamp).date}`;
    document.documentElement.setAttribute("data-time-travel", entry.unid);
    if (entry.unid) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("v", entry.unid);
      window.history.replaceState({}, "", newUrl);
    }
  } catch (err) {
    announceError(`Failed to load version: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function returnToCurrent(): void {
  viewingVersion.value = null;
  viewingMetaOnly.value = false;
  viewingLabel.value = "";
  document.documentElement.removeAttribute("data-time-travel");
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.delete("v");
  window.history.replaceState({}, "", newUrl);
}

function announceError(msg: string): void {
  const region = document.createElement("div");
  region.setAttribute("role", "alert");
  region.className = "fixed bottom-4 right-4 z-50 rounded-md bg-coral-700 px-3 py-2 text-xs text-paper-50 shadow-lg";
  region.textContent = msg;
  document.body.appendChild(region);
  setTimeout(() => region.remove(), 3500);
}

async function openDiff(entry: VersionHistoryEntry): Promise<void> {
  if (!entry.unid) return;
  const url = versionJsonUrl(entry);
  if (!url) return;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) {
      announceError(`Version ${entry.version} not available (${res.status}).`);
      return;
    }
    const fromEntity = (await res.json()) as EntityLike;
    // Build a "to" entity from the current page's data — look for
    // the JSON-LD or fall back to an inline script tag emitted by
    // the page. For now, fetch the current version's JSON via the
    // known current-version filename in the same versions/ dir.
    const currentEntry = sorted.value.find((e) => e.is_current);
    if (!currentEntry?.unid) {
      announceError("Current version not available for comparison.");
      return;
    }
    const currentRes = await fetch(versionJsonUrl(currentEntry), { cache: "force-cache" });
    if (!currentRes.ok) {
      announceError(`Current version not available (${currentRes.status}).`);
      return;
    }
    diffFromEntity.value = fromEntity;
    diffToEntity.value = (await currentRes.json()) as EntityLike;
    diffOpen.value = true;
  } catch (err) {
    announceError(`Failed to load diff: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function closeDiff(): void {
  diffOpen.value = false;
  diffFromEntity.value = null;
  diffToEntity.value = null;
}

function onTimelineKeydown(event: KeyboardEvent): void {
  if (sorted.value.length === 0) return;
  let next = activeIdx.value;
  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    next = Math.min(sorted.value.length - 1, activeIdx.value + 1);
  } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    next = Math.max(0, activeIdx.value - 1);
  } else if (event.key === "Home") {
    next = 0;
  } else if (event.key === "End") {
    next = sorted.value.length - 1;
  } else if (event.key === "Enter") {
    const entry = sorted.value[activeIdx.value];
    if (entry && !entry.is_current && entry.unid) {
      event.preventDefault();
      void viewVersion(entry);
    }
    return;
  } else if (event.key.toLowerCase() === "d") {
    const entry = sorted.value[activeIdx.value];
    if (entry && !entry.is_current && entry.unid) {
      event.preventDefault();
      void openDiff(entry);
    }
    return;
  } else {
    return;
  }
  if (next !== activeIdx.value) {
    event.preventDefault();
    activeIdx.value = next;
    focusActive();
  }
}

function focusActive(): void {
  if (!rootRef.value) return;
  const items = rootRef.value.querySelectorAll<HTMLElement>("[data-entry-idx]");
  const target = items[activeIdx.value];
  target?.focus();
}

function entryId(idx: number): string {
  return `version-entry-${idx}`;
}

interface VersionPayload {
  irdi?: string;
  code?: string;
  type?: string;
  is_current?: boolean;
  version_meta_only?: boolean;
  version_meta?: {
    version?: string | null;
    status?: string | null;
    timestamp?: string | null;
  };
  [key: string]: unknown;
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const v = params.get("v");
  if (!v) return;
  const target = props.entries.find((e) => e.unid === v);
  if (target) void viewVersion(target);
});
</script>

<template>
  <div ref="rootRef">
    <ol
      v-if="sorted.length"
      class="archive-timeline"
      role="listbox"
      aria-label="Version history"
      @keydown="onTimelineKeydown"
    >
      <li
        v-for="(entry, idx) in sorted"
        :key="entry.unid ?? `${entry.version}-${entry.timestamp}`"
        :id="entryId(idx)"
        :data-entry-idx="idx"
        class="archive-entry"
        :data-current="entry.is_current ? 'true' : 'false'"
        :data-active="activeIdx === idx ? 'true' : 'false'"
        :style="{ animationDelay: `${Math.min(idx, 8) * 60}ms` }"
        :tabindex="activeIdx === idx ? 0 : -1"
        :aria-selected="activeIdx === idx ? 'true' : 'false'"
        role="option"
        @click="activeIdx = idx"
      >
        <div class="archive-numeral" aria-hidden="true">
          {{ entry.version ?? "—" }}
        </div>

        <div class="archive-bullet" aria-hidden="true"></div>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              class="wax-seal"
              :data-tone="entry.is_current ? 'current' : statusTone(entry.status)"
            >
              {{ entry.is_current ? "Current" : (entry.status ?? "version") }}
            </span>
            <span class="archive-signature">
              rev {{ entry.revision ?? "—" }}
            </span>
            <span
              v-if="entry.change_request_id"
              class="archive-catalog"
              :title="`Change request ${entry.change_request_id}`"
            >
              CR {{ entry.change_request_id }}
            </span>
          </div>

          <div class="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span class="archive-signature">
              {{ formatDate(entry.timestamp).date }}
              <span v-if="formatDate(entry.timestamp).time" class="text-ink-400">
                · {{ formatDate(entry.timestamp).time }}
              </span>
            </span>
            <span v-if="entry.user" class="archive-signature">
              by {{ entry.user }}
            </span>
          </div>

          <div v-if="multiVersion && !entry.is_current && entry.unid" class="mt-2 flex flex-wrap items-center gap-3">
            <button
              v-if="viewingVersion === entry.unid"
              type="button"
              class="rounded-md border border-coral-400 bg-coral-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-coral-700 transition hover:bg-coral-100 print:hidden"
              @click="returnToCurrent"
            >
              ↩ Returning to current
            </button>
            <button
              v-else
              type="button"
              class="rounded-md border border-hex-300 bg-hex-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-hex-700 transition hover:bg-hex-100 print:hidden"
              @click="viewVersion(entry)"
            >
              ⏱ View this version
            </button>
            <button
              type="button"
              class="rounded-md border border-ink-200 bg-paper-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-600 transition hover:bg-paper-100 print:hidden"
              @click="openDiff(entry)"
            >
              ⇄ Diff vs current
            </button>
            <a
              :href="`/d/${dict}/versions/${code}/${entry.unid}.json`"
              class="text-[11px] font-medium uppercase tracking-wide text-ink-500 transition hover:text-lapis-700 print:hidden"
              download
            >
              ↓ Version JSON
            </a>
          </div>

          <div v-if="(multiVersion || entry.unid) && viewingVersion !== entry.unid" class="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="text-[11px] font-medium uppercase tracking-wide text-lapis-700 transition hover:text-lapis-900 print:hidden"
              @click="toggle(entry)"
              :aria-expanded="isExpanded(entry)"
            >
              {{ isExpanded(entry) ? "Hide source files" : "Show source files" }}
            </button>
            <a
              :href="cddUrl()"
              target="_blank"
              rel="noreferrer noopener"
              class="text-[11px] font-medium uppercase tracking-wide text-ink-500 transition hover:text-lapis-700 print:hidden"
            >
              View on cdd.iec.ch ↗
            </a>
          </div>

          <div v-if="isExpanded(entry)" class="archive-files mt-2">
            <p class="mb-1.5 text-[11px] text-ink-500 italic">
              Source files for this version (UNID
              <code class="text-ink-700">{{ entry.unid ?? "unknown" }}</code>) are
              archived in the OpenCDD data pipeline. Re-fetch from the
              cdd.iec.ch link above for the raw <code>.xls</code> exports.
            </p>
          </div>
        </div>
      </li>
    </ol>

    <p v-else class="text-sm text-ink-500 italic">
      No version history recorded for this entity.
    </p>

    <p class="archive-notice">
      IEC CDD records every published revision of each entity — version
      number, status, timestamp, and the change request that introduced it.
      OpenCDD captures the full chain of custody from
      <code>cdd.iec.ch</code>; the entry marked
      <span class="wax-seal" data-tone="current">Current</span>
      is the one rendered on this page.
    </p>

    <div
      v-if="viewingVersion && viewingMetaOnly"
      class="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800"
      role="status"
    >
      <strong>Metadata-only view.</strong> The historical content for this
      version wasn't captured by the scraper. Only the version stamp and
      provenance are available; for the full record, see
      <code>cdd.iec.ch</code>.
    </div>

    <VersionDiff
      v-if="diffOpen"
      :from="diffFromEntity"
      :to="diffToEntity"
      @close="closeDiff"
    />
  </div>
</template>
