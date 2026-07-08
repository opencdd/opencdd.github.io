/**
 * Top-level registry of dictionaries available in the browser.
 *
 * `data/index.json` is loaded once at build time. Each entry references
 * a dictionary directory under `data/<slug>/`.
 */

import type { EntityType } from "./types";

export interface DictionaryRegistryEntry {
  slug: string;
  parcelId: string;
  title: string;
  sourceLanguage: string;
  translationLanguages: string[];
  counts: Partial<Record<EntityType, number>>;
  metaClassIrdis: string[];
}

export interface DictionaryRegistry {
  dictionaries: DictionaryRegistryEntry[];
}
