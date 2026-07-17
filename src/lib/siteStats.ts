/**
 * Site-wide statistics aggregator.
 *
 * Walks every loaded dictionary and produces a single stats object
 * suitable for the /stats/ page. Build-time only — no client runtime.
 */

import { listRegistryEntries, loadDictionary } from "./data";
import { TABBABLE_TYPES, countForType, entityPluralTitleFor } from "./entityTypeMeta";
import type { EntityType } from "./types";

export interface DictionaryStats {
  slug: string;
  title: string;
  parcelId: string;
  totalEntities: number;
  byType: Partial<Record<EntityType, number>>;
  multiVersionEntities: number;
  totalVersions: number;
}

export interface SiteStats {
  totalDictionaries: number;
  totalEntities: number;
  totalVersions: number;
  multiVersionEntities: number;
  byType: Partial<Record<EntityType, number>>;
  perDictionary: DictionaryStats[];
}

export function computeSiteStats(): SiteStats {
  const perDictionary: DictionaryStats[] = [];
  const aggregateByType: Partial<Record<EntityType, number>> = {};
  let totalEntities = 0;
  let totalVersions = 0;
  let multiVersionEntities = 0;

  for (const entry of listRegistryEntries()) {
    const bundle = loadDictionary(entry.slug);
    const byType: Partial<Record<EntityType, number>> = {};
    let dictTotal = 0;
    for (const type of TABBABLE_TYPES) {
      const c = countForType(bundle, type);
      if (c > 0) byType[type] = c;
      aggregateByType[type] = (aggregateByType[type] ?? 0) + c;
      dictTotal += c;
    }

    let dictVersions = 0;
    let dictMultiVersion = 0;
    for (const type of TABBABLE_TYPES) {
      for (const entity of bundle.entitiesOfType(type)) {
        const vh = entity.version_history ?? [];
        dictVersions += vh.length;
        if (vh.length > 1) dictMultiVersion += 1;
      }
    }

    perDictionary.push({
      slug: entry.slug,
      title: entry.title,
      parcelId: entry.parcelId,
      totalEntities: dictTotal,
      byType,
      multiVersionEntities: dictMultiVersion,
      totalVersions: dictVersions,
    });

    totalEntities += dictTotal;
    totalVersions += dictVersions;
    multiVersionEntities += dictMultiVersion;
  }

  perDictionary.sort((a, b) => b.totalEntities - a.totalEntities);

  return {
    totalDictionaries: perDictionary.length,
    totalEntities,
    totalVersions,
    multiVersionEntities,
    byType: aggregateByType,
    perDictionary,
  };
}

export function entityCountLabel(stats: SiteStats): string {
  return `${stats.totalEntities.toLocaleString()} entities across ${stats.totalDictionaries} dictionaries`;
}

export function topTypes(stats: SiteStats, n = 5): Array<{ type: EntityType; count: number; label: string }> {
  return TABBABLE_TYPES
    .map((type) => ({
      type,
      count: stats.byType[type] ?? 0,
      label: entityPluralTitleFor(type),
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
