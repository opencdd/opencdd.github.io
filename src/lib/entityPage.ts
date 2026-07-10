/**
 * Entity detail page factory — eliminates the getStaticPaths +
 * frontmatter duplication across all 6 entity detail pages.
 *
 * Before: each page (c, p, v, t, u, r) had ~15 lines of identical
 * getStaticPaths + loadDictionary boilerplate, differing only in
 * the entity type string.
 *
 * After: each page calls `entityStaticPaths("class")` and
 * `loadEntityForPage<ClassNode>(dict, irdi)`.
 */

import { loadDictionary, listRegistryEntries } from "./data";
import { codeFromIrdi } from "./irdi";
import type { EntityNode, EntityType } from "./types";
import type { DictionaryBundle } from "./bundle";

/**
 * Generates getStaticPaths for an entity detail page.
 */
export function entityStaticPaths(type: EntityType) {
  return listRegistryEntries().flatMap((entry) => {
    const bundle = loadDictionary(entry.slug);
    return (bundle.byType.get(type) ?? []).map((node) => ({
      params: {
        dict: entry.slug,
        code: node.code ?? codeFromIrdi(node.irdi),
      },
      props: { irdi: node.irdi },
    }));
  });
}

/**
 * Loads an entity + its bundle for a detail page. Returns
 * { node, bundle } — the caller does the type guard + redirect.
 */
export function loadEntityForPage<T extends EntityNode>(
  dict: string,
  irdi: string,
): { node: T | undefined; bundle: DictionaryBundle } {
  const bundle = loadDictionary(dict);
  const node = bundle.entities.get(irdi) as T | undefined;
  return { node, bundle };
}
