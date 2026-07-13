/**
 * Serialization helpers — turn bundle entities into plain JSON objects
 * that Vue filter islands can consume as props.
 *
 * The bundle is only available at build time (Astro frontmatter); these
 * helpers flatten entity nodes into the minimal shape the islands need,
 * so no bundle access happens client-side.
 */

import type { DictionaryBundle } from "./bundle";
import type { EntityNode, PropertyNode } from "./types";
import { codeFromIrdi } from "./irdi";
import { entityRoute, detailableTypeOf } from "./entityTypeMeta";
import { parseDataType, dataTypeLabel } from "./dataType";

export interface EntityListItem {
  code: string;
  name: string;
  href: string | null;
  resolved: boolean;
}

export interface PropertyListItem {
  code: string;
  name: string;
  href: string;
  definition: string | null;
  dataTypeLabel: string | null;
  unitName: string | null;
  unitHref: string | null;
}

export function toEntityListItem(
  irdi: string,
  bundle: DictionaryBundle,
  slug: string,
): EntityListItem {
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

export function toEntityListItems(
  irdis: readonly string[],
  bundle: DictionaryBundle,
  slug: string,
): EntityListItem[] {
  return irdis.map((irdi) => toEntityListItem(irdi, bundle, slug));
}

export function toPropertyListItem(
  p: PropertyNode,
  bundle: DictionaryBundle,
  slug: string,
): PropertyListItem {
  const code = p.code ?? codeFromIrdi(p.irdi);
  const parsed = p.data_type ? parseDataType(p.data_type) : null;
  const dataTypeLabelValue = parsed ? dataTypeLabel(parsed) : null;

  let unitName: string | null = null;
  let unitHref: string | null = null;
  if (p.unit) {
    const unitNode = bundle.find(p.unit) as EntityNode | undefined;
    if (unitNode) {
      unitName = unitNode.preferred_name ?? unitNode.code ?? null;
      if (unitNode.code && unitNode.type) {
        try {
          unitHref = entityRoute(slug, unitNode.type, unitNode.code);
        } catch {
          // routeSegmentFor throws for non-detailable types — skip href
        }
      }
    }
  }

  return {
    code,
    name: p.preferred_name ?? code,
    href: entityRoute(slug, "property", code),
    definition: p.definition ?? null,
    dataTypeLabel: dataTypeLabelValue,
    unitName,
    unitHref,
  };
}

export function toPropertyListItems(
  properties: readonly PropertyNode[],
  bundle: DictionaryBundle,
  slug: string,
): PropertyListItem[] {
  return properties.map((p) => toPropertyListItem(p, bundle, slug));
}
