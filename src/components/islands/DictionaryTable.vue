<script setup lang="ts">
import { ref, computed } from "vue";
import { dictLicenseRegime } from "~/lib/licensing";

export interface DictRow {
  slug: string;
  title: string;
  shortTitle: string;
  parcelId: string;
  publicationId: string;
  edition: string;
  technicalCommittee: string;
  publishedYear: string;
  webstoreUrl: string;
  abstract: string;
  totalEntities: number;
  byType: Record<string, number>;
  totalVersions: number;
  multiVersionEntities: number;
  demonstration: boolean;
  profile: string;
}

const props = defineProps<{
  rows: DictRow[];
}>();

type SortKey = "title" | "totalEntities" | "totalVersions" | "publishedYear" | "classes" | "properties" | "units";
const sortKey = ref<SortKey>("totalEntities");
const sortDir = ref<"asc" | "desc">("desc");
const filter = ref("");
const expandedSlug = ref("");

function licenseBadge(slug: string): { label: string; classes: string } {
  const regime = dictLicenseRegime(slug);
  if (regime === "opencdd-own") {
    return {
      label: "OpenCDD · BSD",
      classes: "bg-teal-50 text-teal-700 border border-teal-200",
    };
  }
  if (regime === "eula-full") {
    return {
      label: "IEC 62720 · § 6 free",
      classes: "bg-teal-50 text-teal-700 border border-teal-200",
    };
  }
  return {
    label: "IEC CDD · § 5 free attributes",
    classes: "bg-lapis-50 text-lapis-700 border border-lapis-200",
  };
}

/** Stacked-bar segments for the entity-mix column. */
function mixSegments(row: DictRow): Array<{ key: string; n: number; color: string; label: string }> {
  const classes = row.byType.class ?? 0;
  const properties = row.byType.property ?? 0;
  const units = (row.byType.unit ?? 0) + (row.byType.list_of_unit ?? 0);
  const other = Math.max(
    0,
    row.totalEntities - classes - properties - units,
  );
  return [
    { key: "class", n: classes, color: "bg-hex-500", label: "classes" },
    { key: "property", n: properties, color: "bg-teal-500", label: "properties" },
    { key: "unit", n: units, color: "bg-lapis-400", label: "units" },
    { key: "other", n: other, color: "bg-paper-300", label: "other" },
  ].filter((s) => s.n > 0);
}

function toggleExpand(slug: string): void {
  expandedSlug.value = expandedSlug.value === slug ? "" : slug;
}

function sortValue(row: DictRow, key: SortKey): string | number {
  switch (key) {
    case "classes": return row.byType.class ?? 0;
    case "properties": return row.byType.property ?? 0;
    case "units": return row.byType.unit ?? 0;
    default: return row[key];
  }
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = "desc";
  }
}

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return props.rows;
  return props.rows.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      r.parcelId.toLowerCase().includes(q) ||
      r.technicalCommittee.toLowerCase().includes(q),
  );
});

const sorted = computed(() => {
  const dir = sortDir.value === "asc" ? 1 : -1;
  return [...filtered.value].sort((a, b) => {
    const av = sortValue(a, sortKey.value);
    const bv = sortValue(b, sortKey.value);
    if (typeof av === "string" && typeof bv === "string") {
      return av.localeCompare(bv) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });
});

const totals = computed(() => {
  const t = { entities: 0, versions: 0, classes: 0, properties: 0, units: 0 };
  for (const r of props.rows) {
    t.entities += r.totalEntities;
    t.versions += r.totalVersions;
    t.classes += r.byType.class ?? 0;
    t.properties += r.byType.property ?? 0;
    t.units += r.byType.unit ?? 0;
  }
  return t;
});

function fmt(n: number): string {
  return n.toLocaleString();
}
</script>

<template>
  <div>
    <!-- Filter + summary -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[200px]">
        <svg viewBox="0 0 20 20" fill="currentColor" class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.39 9.83l3.39 3.39a.75.75 0 1 0 1.06-1.06l-3.39-3.39A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" />
        </svg>
        <input
          v-model="filter"
          type="search"
          placeholder="Filter dictionaries…"
          aria-label="Filter dictionaries"
          class="w-full rounded-lg border border-paper-300 bg-paper-50 py-2 pl-8 pr-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-lapis-500 focus:bg-paper-100 focus:outline-none focus:ring-2 focus:ring-lapis-200"
        />
      </div>
      <div class="flex flex-wrap gap-4 text-xs text-ink-500">
        <span><strong class="font-mono text-ink-800">{{ fmt(totals.entities) }}</strong> entities</span>
        <span><strong class="font-mono text-ink-800">{{ fmt(totals.classes) }}</strong> classes</span>
        <span><strong class="font-mono text-ink-800">{{ fmt(totals.properties) }}</strong> properties</span>
        <span><strong class="font-mono text-ink-800">{{ fmt(totals.units) }}</strong> units</span>
        <span><strong class="font-mono text-ink-800">{{ fmt(totals.versions) }}</strong> versions</span>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto scroll-thin rounded-xl border border-paper-200">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-paper-200 bg-paper-100 text-left text-xs uppercase tracking-wide text-ink-500">
            <th class="px-4 py-2.5 font-medium">
              <button @click="toggleSort('title')" class="flex items-center gap-1 transition hover:text-ink-700">
                Dictionary
                <span v-if="sortKey === 'title'" class="text-lapis-500">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </button>
            </th>
            <th class="px-3 py-2.5 font-medium">Publication</th>
            <th class="px-3 py-2.5 text-right font-medium">
              <button @click="toggleSort('classes')" class="ml-auto flex items-center gap-1 transition hover:text-ink-700">
                Classes
                <span v-if="sortKey === 'classes'" class="text-lapis-500">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </button>
            </th>
            <th class="px-3 py-2.5 text-right font-medium">
              <button @click="toggleSort('properties')" class="ml-auto flex items-center gap-1 transition hover:text-ink-700">
                Properties
                <span v-if="sortKey === 'properties'" class="text-lapis-500">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </button>
            </th>
            <th class="px-3 py-2.5 text-right font-medium">
              <button @click="toggleSort('units')" class="ml-auto flex items-center gap-1 transition hover:text-ink-700">
                Units
                <span v-if="sortKey === 'units'" class="text-lapis-500">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </button>
            </th>
            <th class="px-3 py-2.5 text-right font-medium">
              <button @click="toggleSort('totalEntities')" class="ml-auto flex items-center gap-1 transition hover:text-ink-700">
                Total
                <span v-if="sortKey === 'totalEntities'" class="text-lapis-500">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </button>
            </th>
            <th class="px-3 py-2.5 font-medium">Mix</th>
            <th class="px-3 py-2.5 text-right font-medium">
              <button @click="toggleSort('totalVersions')" class="ml-auto flex items-center gap-1 transition hover:text-ink-700">
                Versions
                <span v-if="sortKey === 'totalVersions'" class="text-lapis-500">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </button>
            </th>
            <th class="px-3 py-2.5 text-right font-medium">
              <button @click="toggleSort('publishedYear')" class="ml-auto flex items-center gap-1 transition hover:text-ink-700">
                Year
                <span v-if="sortKey === 'publishedYear'" class="text-lapis-500">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in sorted" :key="row.slug">
            <tr
              :class="[
                'group cursor-pointer border-b border-paper-100 transition hover:bg-paper-100/50',
                expandedSlug === row.slug && 'bg-paper-100/70',
              ]"
              :aria-expanded="expandedSlug === row.slug"
              @click="toggleExpand(row.slug)"
              @keydown.enter="toggleExpand(row.slug)"
              tabindex="0"
            >
              <td class="px-4 py-3">
                <a
                  :href="`/d/${row.slug}/`"
                  class="font-medium text-ink-900 transition group-hover:text-lapis-700"
                  @click.stop
                >
                  {{ row.shortTitle }}
                </a>
                <p class="mt-0.5 flex flex-wrap gap-1">
                  <span
                    class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    :class="licenseBadge(row.slug).classes"
                  >
                    {{ licenseBadge(row.slug).label }}
                  </span>
                  <span
                    v-if="row.demonstration"
                    class="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700"
                  >
                    Demo
                  </span>
                  <span
                    v-if="row.profile"
                    class="rounded-full bg-sand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600"
                  >
                    {{ row.profile }}
                  </span>
                </p>
              </td>
              <td class="px-3 py-3 text-xs text-ink-500">
                <div>{{ row.publicationId }}</div>
                <div class="text-ink-400">{{ row.technicalCommittee }}</div>
              </td>
              <td class="px-3 py-3 text-right font-mono text-xs text-ink-600">{{ fmt(row.byType.class ?? 0) }}</td>
              <td class="px-3 py-3 text-right font-mono text-xs text-ink-600">{{ fmt(row.byType.property ?? 0) }}</td>
              <td class="px-3 py-3 text-right font-mono text-xs text-ink-600">{{ fmt(row.byType.unit ?? 0) }}</td>
              <td class="px-3 py-3 text-right font-mono text-sm font-semibold text-ink-800">{{ fmt(row.totalEntities) }}</td>
              <td class="px-3 py-3">
                <div
                  class="flex h-2 w-16 overflow-hidden rounded-full"
                  :title="mixSegments(row).map((s) => `${fmt(s.n)} ${s.label}`).join(' · ')"
                  role="img"
                  :aria-label="mixSegments(row).map((s) => `${fmt(s.n)} ${s.label}`).join(', ')"
                >
                  <div
                    v-for="seg in mixSegments(row)"
                    :key="seg.key"
                    :class="seg.color"
                    :style="{ width: (seg.n / row.totalEntities) * 100 + '%' }"
                  />
                </div>
              </td>
              <td class="px-3 py-3 text-right font-mono text-xs text-ink-500">{{ fmt(row.totalVersions) }}</td>
              <td class="px-3 py-3 text-right font-mono text-xs text-ink-500">{{ row.publishedYear || '—' }}</td>
            </tr>
            <tr v-if="expandedSlug === row.slug" class="border-b border-paper-100 bg-paper-50">
              <td :colspan="9" class="px-4 py-4">
                <p class="max-w-3xl text-xs leading-relaxed text-ink-600">
                  <span class="font-semibold text-ink-700">{{ row.title }}.</span>
                  {{ row.abstract }}
                </p>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <p class="mt-3 text-xs text-ink-400">
      Click a column header to sort. Click a row for its abstract. Click a
      dictionary name to browse.
    </p>
  </div>
</template>
