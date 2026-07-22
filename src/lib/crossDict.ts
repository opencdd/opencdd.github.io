/**
 * Cross-dictionary concept index.
 *
 * Builds a name→entities map across ALL dictionaries at build time.
 * Entity pages call findCrossDictMatches() to show "also appears in"
 * other dictionaries.
 *
 * The index is cached at module level — built once per build, not per
 * page. With ~20,000 entities across 5 dictionaries, the Map is ~1MB
 * in memory, acceptable for a build-time process.
 */

import { listDictionaries } from "./dictionary";
import { loadDictionary } from "./data";
import { codeFromIrdi } from "./irdi";
import { routeSegmentFor, ENTITY_TYPE_ORDER } from "./entityTypeMeta";
import type { EntityType } from "./types";

export interface CrossDictMatch {
  dict: string;
  dictTitle: string;
  code: string;
  type: string;
  href: string;
  name: string;
}

let cache: Map<string, CrossDictMatch[]> | null = null;

function buildIndex(): Map<string, CrossDictMatch[]> {
  if (cache) return cache;
  cache = new Map();

  for (const d of listDictionaries()) {
    if (d.demonstration) continue;
    const bundle = loadDictionary(d.slug);
    for (const type of ENTITY_TYPE_ORDER as readonly string[]) {
      let segment: string;
      try {
        segment = routeSegmentFor(type);
      } catch {
        continue;
      }
      for (const node of bundle.entitiesOfType(type)) {
        const rawName = node.preferred_name;
        if (!rawName) continue;
        const key = rawName.toLowerCase().trim();
        if (key.length < 4) continue;
        const code = node.code ?? codeFromIrdi(node.irdi);
        const entry: CrossDictMatch = {
          dict: d.slug,
          dictTitle: d.shortTitle,
          code,
          type,
          href: `/d/${d.slug}/${segment}/${code}/`,
          name: rawName,
        };
        const arr = cache.get(key) ?? [];
        arr.push(entry);
        cache.set(key, arr);
      }
    }
  }

  return cache;
}

export function findCrossDictMatches(
  name: string | undefined,
  excludeDict: string,
): CrossDictMatch[] {
  if (!name) return [];
  const index = buildIndex();
  const key = name.toLowerCase().trim();
  const matches = index.get(key) ?? [];
  return matches.filter((m) => m.dict !== excludeDict);
}
