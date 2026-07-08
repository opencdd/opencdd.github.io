/**
 * Single source of truth for per-entity-type metadata.
 *
 * Every consumer that needs to know "what label does this type have?",
 * "what route segment?", "what badge tone?", "does this type have an
 * overview tab?" reads from this module. Adding a type = adding one
 * entry; every page, badge, route, and count chip picks it up
 * automatically.
 */

import type { EntityNode, EntityType } from "./types";

export type BadgeTone =
  | "accent"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "neutral";

export interface EntityTypeMeta {
  readonly type: EntityType;
  readonly singular: string;
  readonly plural: string;
  readonly badgeTone: BadgeTone;
  readonly routeSegment?: string;
  readonly hasOverviewTab: boolean;
}

const REGISTRY: Readonly<Record<EntityType, EntityTypeMeta>> = {
  class: {
    type: "class",
    singular: "class",
    plural: "classes",
    badgeTone: "accent",
    routeSegment: "c",
    hasOverviewTab: false,
  },
  property: {
    type: "property",
    singular: "property",
    plural: "properties",
    badgeTone: "emerald",
    routeSegment: "p",
    hasOverviewTab: true,
  },
  value_list: {
    type: "value_list",
    singular: "value list",
    plural: "value lists",
    badgeTone: "amber",
    routeSegment: "v",
    hasOverviewTab: true,
  },
  value_term: {
    type: "value_term",
    singular: "value term",
    plural: "value terms",
    badgeTone: "amber",
    routeSegment: "t",
    hasOverviewTab: true,
  },
  unit: {
    type: "unit",
    singular: "unit",
    plural: "units",
    badgeTone: "rose",
    routeSegment: "u",
    hasOverviewTab: true,
  },
  relation: {
    type: "relation",
    singular: "relation",
    plural: "relations",
    badgeTone: "violet",
    routeSegment: "r",
    hasOverviewTab: true,
  },
  view_control: {
    type: "view_control",
    singular: "view control",
    plural: "view controls",
    badgeTone: "neutral",
    hasOverviewTab: false,
  },
};

export const ENTITY_TYPE_ORDER: readonly EntityType[] = [
  "class",
  "property",
  "value_list",
  "value_term",
  "unit",
  "relation",
  "view_control",
];

export const DETAILABLE_TYPES: readonly EntityType[] = ENTITY_TYPE_ORDER.filter(
  (t) => REGISTRY[t].routeSegment !== undefined,
);

export const TABBABLE_TYPES: readonly EntityType[] = ENTITY_TYPE_ORDER.filter(
  (t) => REGISTRY[t].hasOverviewTab,
);

export function entityTypeMeta(type: EntityType): EntityTypeMeta {
  return REGISTRY[type];
}

export function entityLabelFor(type: EntityType): string {
  return REGISTRY[type].singular;
}

export function entityPluralLabelFor(type: EntityType): string {
  return REGISTRY[type].plural;
}

export function entityPluralTitleFor(type: EntityType): string {
  const plural = REGISTRY[type].plural;
  return plural.charAt(0).toUpperCase() + plural.slice(1);
}

export function badgeToneFor(type: EntityType): BadgeTone {
  return REGISTRY[type].badgeTone;
}

export function routeSegmentFor(type: EntityType): string {
  const seg = REGISTRY[type].routeSegment;
  if (seg === undefined) {
    throw new Error(`no route segment for entity type: ${type}`);
  }
  return seg;
}

const SEGMENT_TO_TYPE: Readonly<Record<string, EntityType>> = (() => {
  const out: Record<string, EntityType> = {};
  for (const t of DETAILABLE_TYPES) {
    const seg = REGISTRY[t].routeSegment!;
    out[seg] = t;
  }
  return out;
})();

export function entityTypeForSegment(
  segment: string | null | undefined,
): EntityType | null {
  if (!segment) return null;
  return SEGMENT_TO_TYPE[segment] ?? null;
}

export function entityRoute(slug: string, type: EntityType, code: string): string {
  return `/d/${slug}/${routeSegmentFor(type)}/${code}`;
}

export function countForType(
  bundle: Pick<BundleShaped, "byType">,
  type: EntityType,
): number {
  return bundle.byType.get(type)?.length ?? 0;
}

export function totalEntityCount(
  bundle: Pick<BundleShaped, "byType">,
): number {
  let sum = 0;
  for (const type of ENTITY_TYPE_ORDER) sum += countForType(bundle, type);
  return sum;
}

export function detailableTypeOf(node: EntityNode): EntityType | null {
  return REGISTRY[node.type].routeSegment !== undefined ? node.type : null;
}

// Structural shape used by countForType/totalEntityCount so this module
// doesn't have a circular dep on bundle.ts.
interface BundleShaped {
  byType: ReadonlyMap<EntityType, readonly EntityNode[]>;
}
