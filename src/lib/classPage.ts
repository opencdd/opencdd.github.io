/**
 * Class page model — extracts the data-assembly logic from the class
 * detail page into a pure, testable function.
 *
 * Before this module, `c/[code].astro` had 80+ lines of frontmatter:
 * 8 bundle queries, 4 resolveIrdis calls, 5 serializations, 5 filter
 * threshold checks — all untestable because it was coupled to the page
 * file.
 *
 * Now the page calls `buildClassPageData(node, bundle, slug)` and gets
 * a structured object. The page becomes a thin render loop.
 */

import type { DictionaryBundle } from "./bundle";
import type { ClassNode, PropertyNode, RelationNode } from "./types";
import {
  toEntityListItems,
  toPropertyListItems,
  type EntityListItem,
  type PropertyListItem,
} from "./listItems";

const FILTER_ENTITY_THRESHOLD = 10;
const FILTER_PROPERTY_THRESHOLD = 8;

export interface ClassPageStats {
  label: string;
  value: number;
  href?: string;
}

export interface EntitySectionData {
  irdis: string[];
  items: EntityListItem[];
  useFilter: boolean;
  unresolved: string[];
}

export interface PropertySectionData {
  properties: readonly PropertyNode[];
  items: PropertyListItem[];
  useFilter: boolean;
  unresolved: string[];
  applicableCount: number;
}

export interface ClassPageData {
  node: ClassNode;
  slug: string;

  stats: ClassPageStats[];

  ancestorCrumbs: Array<{ irdi: string }>;
  higherLevel: readonly ClassNode[];
  unresolvedSuperclass: string[];

  declared: PropertySectionData;
  inherited: readonly PropertyNode[];

  imported: EntitySectionData;

  subclasses: {
    nodes: readonly ClassNode[];
    items: EntityListItem[];
    useFilter: boolean;
  };

  isCaseOf: EntitySectionData;
  instances: readonly ClassNode[];

  composition: EntitySectionData;

  relationsAsDomain: {
    nodes: readonly RelationNode[];
    items: EntityListItem[];
    useFilter: boolean;
  };

  relationsAsCodomain: {
    nodes: readonly RelationNode[];
    items: EntityListItem[];
    useFilter: boolean;
  };
}

export function buildClassPageData(
  node: ClassNode,
  bundle: DictionaryBundle,
  slug: string,
): ClassPageData {
  const subclasses = bundle.subclassesOf(node.irdi);
  const instances = bundle.instancesOf(node.irdi);
  const declared = bundle.propertiesByClassIrdi(node.irdi);
  const effective = bundle.effectivePropertiesOf(node.irdi);
  const declaredIrdiSet = new Set(declared.map((p) => p.irdi));
  const inherited = effective.properties.filter(
    (p) => !declaredIrdiSet.has(p.irdi),
  );
  const relationsAsDomain = bundle.relationsForClass(node.irdi);
  const relationsAsCodomain = bundle.relationsForCodomainClass(node.irdi);
  const ancestorChain = bundle.ancestorChainOf(node.irdi);

  const applicableIrdis = node.applicable_properties ?? [];
  const importedIrdis = node.imported_properties ?? [];
  const isCaseOfIrdis = node.is_case_of ?? [];
  const compositionIrdis = node.sub_class_selection ?? [];

  const unresolvedSuperclass =
    node.superclass && !bundle.hasEntity(node.superclass)
      ? [node.superclass]
      : [];

  const higherLevel = ancestorChain.slice(0, -1);

  const stats: ClassPageStats[] = [
    { label: "Properties", value: declared.length, href: "#declared-properties" },
    { label: "Subclasses", value: subclasses.length, href: "#subclasses" },
    ...(inherited.length > 0
      ? [{ label: "Inherited", value: inherited.length }]
      : []),
  ];

  const declaredItems = toPropertyListItems(declared, bundle, slug);
  const importedItems = toEntityListItems(importedIrdis, bundle, slug);
  const subclassItems = toEntityListItems(
    subclasses.map((c) => c.irdi),
    bundle,
    slug,
  );
  const isCaseOfItems = toEntityListItems(isCaseOfIrdis, bundle, slug);
  const compositionItems = toEntityListItems(compositionIrdis, bundle, slug);
  const relationDomainItems = toEntityListItems(
    relationsAsDomain.map((r) => r.irdi),
    bundle,
    slug,
  );
  const relationCodomainItems = toEntityListItems(
    relationsAsCodomain.map((r) => r.irdi),
    bundle,
    slug,
  );

  return {
    node,
    slug,
    stats,
    ancestorCrumbs: ancestorChain.map((c) => ({ irdi: c.irdi })),
    higherLevel,
    unresolvedSuperclass,
    declared: {
      properties: declared,
      items: declaredItems,
      useFilter: declaredItems.length > FILTER_PROPERTY_THRESHOLD,
      unresolved: bundle.resolveIrdis(applicableIrdis).unresolved,
      applicableCount: applicableIrdis.length,
    },
    inherited,
    imported: {
      irdis: importedIrdis,
      items: importedItems,
      useFilter: importedItems.length > FILTER_ENTITY_THRESHOLD,
      unresolved: bundle.resolveIrdis(importedIrdis).unresolved,
    },
    subclasses: {
      nodes: subclasses,
      items: subclassItems,
      useFilter: subclassItems.length > FILTER_ENTITY_THRESHOLD,
    },
    isCaseOf: {
      irdis: isCaseOfIrdis,
      items: isCaseOfItems,
      useFilter: isCaseOfItems.length > FILTER_ENTITY_THRESHOLD,
      unresolved: bundle.resolveIrdis(isCaseOfIrdis).unresolved,
    },
    instances,
    composition: {
      irdis: compositionIrdis,
      items: compositionItems,
      useFilter: compositionItems.length > FILTER_ENTITY_THRESHOLD,
      unresolved: bundle.resolveIrdis(compositionIrdis).unresolved,
    },
    relationsAsDomain: {
      nodes: relationsAsDomain,
      items: relationDomainItems,
      useFilter: relationDomainItems.length > FILTER_ENTITY_THRESHOLD,
    },
    relationsAsCodomain: {
      nodes: relationsAsCodomain,
      items: relationCodomainItems,
      useFilter: relationCodomainItems.length > FILTER_ENTITY_THRESHOLD,
    },
  };
}
