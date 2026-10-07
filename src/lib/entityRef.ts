/**
 * Entity reference resolution — the single seam where an IRDI becomes
 * a linkable item.
 *
 * Before this module, the same resolution chain (bundle.find →
 * detailableTypeOf → entityRoute) was duplicated in EntityLink.astro,
 * EntityLinkList.astro, and listItems.ts. Routing changes required
 * updating all three. Now they all call this function.
 */

import type { DictionaryBundle } from "./bundle";
import type { EntityNode } from "./types";
import { codeFromIrdi } from "./irdi";
import { entityRoute, detailableTypeOf } from "./entityTypeMeta";
import { isPubliclyServed } from "./licensing";

export interface EntityRef {
  /** Short code, e.g. "AAA001". Falls back to codeFromIrdi. */
  code: string;
  /** Display name — preferred_name if available, else code. */
  name: string;
  /** Detail-page URL, or null if the entity isn't in the browser data. */
  href: string | null;
  /** True when the entity exists in the bundle. */
  resolved: boolean;
  /** First ~200 chars of the entity definition, for hover previews. */
  definition: string | null;
  /** True when the link crosses into another dictionary (unit bindings). */
  crossDictionary?: boolean;
}

/**
 * Cross-dictionary schemes. References whose IRDI data-identifier names
 * one of these dictionaries resolve into that dictionary's pages — our
 * own dictionaries bind their unit references to the IEC 62720 units
 * dictionary (free in its entirety under EULA §6) at build time.
 */
const CROSS_DICTIONARY_SCHEMES: Record<string, string> = {
  "62720": "iec-62720",
};

function crossDictionaryRef(irdi: string): EntityRef | null {
  const m = irdi.match(/\/\/\/([^/#]+)#([^#]+)/);
  if (!m?.[1] || !m[2]) return null;
  const slug = CROSS_DICTIONARY_SCHEMES[m[1]];
  if (!slug || !isPubliclyServed(slug)) return null;
  const code = m[2];
  return {
    code,
    name: code,
    href: entityRoute(slug, "unit", code),
    resolved: false,
    definition: null,
    crossDictionary: true,
  };
}

export function resolveEntityRef(
  irdi: string,
  bundle: DictionaryBundle,
  slug: string,
): EntityRef {
  const node = bundle.find(irdi) as EntityNode | undefined;
  const type = node?.type ?? null;
  const detailable = type
    ? detailableTypeOf({ type, irdi } as EntityNode)
    : null;
  const code = node?.code ?? codeFromIrdi(irdi);
  const name = node?.preferred_name ?? code;
  const href = detailable ? entityRoute(slug, detailable, code) : null;
  if (href === null) {
    const cross = crossDictionaryRef(irdi);
    if (cross) return cross;
  }
  const rawDef = node?.definition;
  const definition = rawDef
    ? rawDef.length > 200
      ? rawDef.slice(0, 200) + "…"
      : rawDef
    : null;
  return { code, name, href, resolved: !!node, definition };
}
