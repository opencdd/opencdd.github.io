<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface RecentEntry {
  irdi: string;
  code: string;
  name: string;
  type: string;
  href: string;
  ts: number;
}

const STORAGE_KEY = "opencdd:recent";
const MAX_ENTRIES = 12;

const entries = ref<RecentEntry[]>([]);
const enabled = ref(false);

function readStorage(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is RecentEntry =>
      typeof e === "object" && e !== null &&
      "irdi" in e && "href" in e && "ts" in e,
    );
  } catch {
    return [];
  }
}

function writeStorage(list: RecentEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Quota exceeded or storage disabled — silently skip.
  }
}

function recordCurrentPage(): void {
  if (typeof window === "undefined") return;
  // Only record entity detail pages: /d/<dict>/<segment>/<code>/
  const m = window.location.pathname.match(/^\/d\/([^/]+)\/([cptuvr]|vc)\/([^/]+)\/?$/);
  if (!m) return;
  const [, dict, segment, code] = m;
  if (!dict || !segment || !code) return;

  // Pull entity name from the page's H1 (works on Astro-rendered pages
  // across view transitions; no fetch needed).
  const h1 = document.querySelector("main h1, article h1, h1");
  const name = h1?.textContent?.trim() ?? code;
  const type = segmentToType(segment);

  const entry: RecentEntry = {
    irdi: `${dict}#${code}`,
    code,
    name,
    type,
    href: window.location.pathname,
    ts: Date.now(),
  };

  const next = [entry, ...readStorage().filter((e) => e.irdi !== entry.irdi)].slice(0, MAX_ENTRIES);
  writeStorage(next);
  entries.value = next;
}

function segmentToType(segment: string): string {
  switch (segment) {
    case "c": return "class";
    case "p": return "property";
    case "v": return "value_list";
    case "t": return "value_term";
    case "u": return "unit";
    case "r": return "relation";
    case "vc": return "view_control";
    default: return segment;
  }
}

function clearAll(): void {
  writeStorage([]);
  entries.value = [];
}

function formatRelative(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} day${sec >= 172800 ? "s" : ""} ago`;
  return new Date(ts).toLocaleDateString();
}

function onPageLoad(): void {
  recordCurrentPage();
}

onMounted(() => {
  enabled.value = true;
  entries.value = readStorage();
  recordCurrentPage();
  document.addEventListener("astro:page-load", onPageLoad);
});

onUnmounted(() => {
  document.removeEventListener("astro:page-load", onPageLoad);
});
</script>

<template>
  <section
    v-if="enabled"
    class="space-y-2"
    aria-label="Recently viewed"
  >
    <div class="flex items-baseline justify-between">
      <h2 class="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
        Recently viewed
      </h2>
      <button
        v-if="entries.length > 0"
        type="button"
        class="text-[10px] uppercase tracking-wide text-ink-400 transition hover:text-coral-700"
        @click="clearAll"
      >
        Clear
      </button>
    </div>
    <p
      v-if="entries.length === 0"
      class="text-[11px] italic text-ink-400"
    >
      Entities you visit will appear here.
    </p>
    <ol v-else class="space-y-0.5 text-xs">
      <li
        v-for="entry in entries"
        :key="entry.irdi + entry.ts"
      >
        <a
          :href="entry.href"
          class="flex items-baseline gap-2 rounded px-1 py-0.5 transition hover:bg-paper-100"
        >
          <span class="font-mono text-[10px] text-ink-400">{{ entry.code }}</span>
          <span class="flex-1 truncate text-ink-700">{{ entry.name }}</span>
          <span class="text-[10px] text-ink-400">{{ formatRelative(entry.ts) }}</span>
        </a>
      </li>
    </ol>
  </section>
</template>
