/**
 * Dictionary value object — composes registry, metadata, and bundle
 * behind a single interface.
 *
 * The browser used to juggle three sources of dict-level truth:
 *   - data/index.json        → DictionaryRegistryEntry (data-derived)
 *   - src/lib/dictMetadata.ts → DictMetadata          (editorial)
 *   - DictionaryBundle        → query layer            (per-slug cache)
 *
 * Every page that rendered information about a dictionary had to call
 * listRegistryEntries() + dictMetadataOrFallback() + loadDictionary()
 * and synthesise the fields it wanted across the three. The "where
 * does this fact come from?" seam was invisible.
 *
 * `Dictionary` replaces that with one object. Callers consume a
 * denormalised view; the composition happens once in the factory.
 *
 * Two flavours:
 *   - Dictionary           — lightweight, no bundle. For grids/lists.
 *   - DictionaryWithBundle — Dictionary + bundle. For detail pages.
 *
 * The split lets the homepage call listDictionaries() without
 * triggering 21,000-entity JSON loads it doesn't need.
 */

import type { EntityType } from "./types";
import type { DictionaryBundle } from "./bundle";
import type { DictMetadata } from "./dictMetadata";
import { DICT_METADATA } from "./dictMetadata";
import {
  listRegistryEntries,
  loadDictionary,
  loadRegistry,
} from "./data";
import type { DictionaryRegistryEntry } from "./registry";

export interface Dictionary {
  /** Stable URL slug, e.g. "iec61360". */
  slug: string;
  /** Parcel identifier from the source data, e.g. "IEC61360". */
  parcelId: string;

  /** Display title (canonical IEC publication title). */
  title: string;
  /** Short scannable label for cards and headers. */
  shortTitle: string;
  /** One-paragraph abstract paraphrased from the IEC webstore. */
  abstract: string;
  /** IEC publication reference, e.g. "IEC 61360-1:2017". */
  publicationId: string;
  /** Edition, e.g. "Ed 4.0". */
  edition: string;
  /** Responsible IEC technical committee, e.g. "IEC TC 3". */
  technicalCommittee: string;
  /** Direct link to the IEC webstore publication page. */
  webstoreUrl: string;
  /** Publication year, if known. */
  publishedYear?: number;
  /** True for demonstration fixtures (e.g. OceanRunner). */
  demonstration: boolean;

  /** Source language code, e.g. "en". */
  sourceLanguage: string;
  /** Translation language codes present in the data, e.g. ["de","fr"]. */
  translationLanguages: string[];
  /** Per-type entity counts. */
  counts: Partial<Record<EntityType, number>>;
  /** Meta-class IRDIs the dictionary declares. */
  metaClassIrdis: string[];
}

export interface DictionaryWithBundle extends Dictionary {
  /** Loaded query layer (entities, tree, indexes). */
  bundle: DictionaryBundle;
}

/**
 * Look up the editorial metadata for a slug. Falls back to a minimal
 * entry built from the registry title if the slug is not in the
 * metadata table. This helper lives here (not in dictMetadata.ts)
 * because it composes two sources — the metadata table and the
 * registry fallback — which is the same thing `Dictionary` does.
 */
function metadataFor(slug: string, fallbackTitle: string): DictMetadata {
  return (
    DICT_METADATA[slug] ?? {
      publicationId: slug,
      edition: "",
      title: fallbackTitle,
      shortTitle: fallbackTitle,
      abstract: "",
      technicalCommittee: "",
      webstoreUrl: "",
    }
  );
}

function toDictionary(
  entry: DictionaryRegistryEntry,
  meta: DictMetadata,
): Dictionary {
  return {
    slug: entry.slug,
    parcelId: entry.parcelId,
    title: meta.title,
    shortTitle: meta.shortTitle,
    abstract: meta.abstract,
    publicationId: meta.publicationId,
    edition: meta.edition,
    technicalCommittee: meta.technicalCommittee,
    webstoreUrl: meta.webstoreUrl,
    publishedYear: meta.publishedYear,
    demonstration: meta.demonstration === true,
    sourceLanguage: entry.sourceLanguage,
    translationLanguages: entry.translationLanguages,
    counts: entry.counts,
    metaClassIrdis: entry.metaClassIrdis,
  };
}

/**
 * Lightweight dictionary list — registry + metadata only, no bundles
 * loaded. Use this for homepage grids, navigation, or anything that
 * only needs titles/abstracts/counts.
 */
export function listDictionaries(): Dictionary[] {
  return listRegistryEntries().map((entry) =>
    toDictionary(entry, metadataFor(entry.slug, entry.title)),
  );
}

/**
 * Full dictionary lookup — registry + metadata + loaded bundle. Use
 * this for detail pages that need to query entities.
 */
export function getDictionary(slug: string): DictionaryWithBundle {
  const registry = loadRegistry();
  const entry = registry.dictionaries.find((d) => d.slug === slug);
  if (!entry) throw new Error(`unknown dictionary slug: ${slug}`);
  const bundle = loadDictionary(slug);
  const meta = metadataFor(slug, entry.title);
  return { ...toDictionary(entry, meta), bundle };
}

/**
 * Lookup by slug without loading the bundle — for pages that need
 * the dict's metadata but not its entities (e.g. /d/[dict]/about/).
 */
export function findDictionary(slug: string): Dictionary | undefined {
  const entry = listRegistryEntries().find((d) => d.slug === slug);
  if (!entry) return undefined;
  return toDictionary(entry, metadataFor(entry.slug, entry.title));
}
