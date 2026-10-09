<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import "leaflet/dist/leaflet.css";
import type * as LTypes from "leaflet";
import type { FacetItem } from "./FacetedBrowser.vue";

export interface MapItem extends FacetItem {
  lat: number;
  lon: number;
}

const props = defineProps<{
  items: MapItem[];
}>();

const showMap = ref(false);
const mapEl = ref<HTMLElement | null>(null);
// Leaflet touches window at module load — lazily imported on first
// toggle so the island stays SSR-safe.
let L: typeof LTypes | null = null;
let map: LTypes.Map | null = null;
let layer: LTypes.LayerGroup | null = null;

const hasCoords = computed(() => props.items.length > 0);

function markerIcon(): LTypes.DivIcon {
  return L.divIcon({
    className: "poi-pin",
    html: '<span class="poi-pin-dot"></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function render(): void {
  if (!map || !layer) return;
  layer.clearLayers();
  const bounds: [number, number][] = [];
  for (const item of props.items) {
    const m = L.marker([item.lat, item.lon], {
      icon: markerIcon(),
      title: `${item.name} (${item.code})`,
      alt: item.name,
    });
    m.bindPopup(
      `<a href="${item.href}"><strong>${item.name}</strong></a><br>` +
        `<span style="font-family:var(--font-mono,monospace);font-size:10px">${item.code}</span>`,
    );
    m.addTo(layer);
    bounds.push([item.lat, item.lon]);
  }
  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12 });
  }
}

async function toggle(): Promise<void> {
  showMap.value = !showMap.value;
  if (showMap.value) {
    await nextTick();
    if (!L) L = (await import("leaflet")).default;
    if (!map && mapEl.value) {
      map = L.map(mapEl.value, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      layer = L.layerGroup().addTo(map);
      render();
    } else if (map) {
      map.invalidateSize();
      render();
    }
  }
}

onMounted(() => {
  // nothing until toggled — the map is lazily created
});

watch(
  () => props.items,
  () => {
    if (showMap.value) render();
  },
  { deep: false },
);
</script>

<template>
  <div v-if="hasCoords" class="mt-4 print:hidden">
    <button
      type="button"
      @click="toggle"
      class="inline-flex items-center gap-1.5 rounded-lg border border-paper-300 bg-paper-50 px-3 py-1.5 text-sm font-medium text-ink-700 transition hover:border-lapis-300 hover:bg-lapis-50/30"
      :aria-expanded="showMap"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
        <path d="M8 0a5 5 0 0 0-5 5c0 4 5 11 5 11s5-7 5-11a5 5 0 0 0-5-5zm0 7.5A2.5 2.5 0 1 1 8 2a2.5 2.5 0 0 1 0 5.5z" />
      </svg>
      {{ showMap ? "Hide map" : `Show map (${items.length})` }}
    </button>
    <div
      v-show="showMap"
      ref="mapEl"
      class="mt-3 h-[480px] w-full overflow-hidden rounded-xl border border-paper-300"
      role="application"
      aria-label="Map of the filtered places"
    />
  </div>
</template>

<style>
.poi-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.85);
  border: 2px solid #1d4ed8;
}
.poi-pin-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #1d4ed8;
}
.leaflet-popup-content a {
  color: #1d4ed8;
  text-decoration: underline;
}
</style>
