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

export interface EntityRef {
  /** Short code, e.g. "AAA001". Falls back to codeFromIrdi. */
  code: string;
  /** Display name — preferred_name if available, else code. */
  name: string;
  /** Detail-page URL, or null if the entity isn't in the browser data. */
  href: string | null;
  /** True when the entity exists in the bundle. */
  resolved: boolean;
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
  return { code, name, href, resolved: !!node };
}
