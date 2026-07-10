/**
 * DictionaryBundle — read-only bundle wrapping a loaded dictionary.
 * Owns the derived indexes (subclasses, classes-by-property, etc.)
 * and the cycle-safe ancestor-chain / effective-properties walkers.
 *
 * This is a build-time port of the React browser's DictionaryBundle.
 * In Astro, all pages are pre-rendered, so the bundle is loaded once
 * per build and the indexes are computed once.
 */

import type {
  ClassNode,
  EntityNode,
  EntityType,
  PropertyNode,
  RelationNode,
} from "./types";
import { isClassNode, isPropertyNode } from "./types";
import type { DictionaryRegistryEntry } from "./registry";
import { entityMatches, normalizeSearchQuery } from "./search";

export interface ClassTreeNode {
  readonly irdi: string;
  readonly code: string | undefined;
  readonly name: string | undefined;
  readonly classType: string | undefined;
  readonly superclass: string | undefined;
  readonly children: ClassTreeNode[];
}

const EMPTY_CLASSES: readonly ClassNode[] = Object.freeze([]);
const EMPTY_RELATIONS: readonly RelationNode[] = Object.freeze([]);
const EMPTY_PROPERTIES: readonly PropertyNode[] = Object.freeze([]);
const EMPTY_ENTITIES: readonly EntityNode[] = Object.freeze([]);

const SEARCH_RESULT_LIMIT = 50;

const ENTITY_TYPE_ORDER_FOR_SEARCH: readonly EntityType[] = [
  "class",
  "property",
  "value_list",
  "value_term",
  "unit",
  "relation",
  "view_control",
];

function byCodeAscending(a: EntityNode, b: EntityNode): number {
  return (a.code ?? "").localeCompare(b.code ?? "");
}

export class DictionaryBundle {
  private readonly subclassesByIrdi: ReadonlyMap<string, readonly ClassNode[]>;
  private readonly classesByPropertyIrdi: ReadonlyMap<string, readonly ClassNode[]>;
  private readonly instancesByPowertypeIrdi: ReadonlyMap<string, readonly ClassNode[]>;
  private readonly relationsByDomainIrdi: ReadonlyMap<string, readonly RelationNode[]>;
  private readonly relationsByCodomainIrdi: ReadonlyMap<string, readonly RelationNode[]>;
  private readonly propertiesByUnitIrdi: ReadonlyMap<string, readonly PropertyNode[]>;
  private readonly propertiesByValueListIrdi: ReadonlyMap<string, readonly PropertyNode[]>;
  private readonly declaredPropertiesByClassIrdi: ReadonlyMap<string, readonly PropertyNode[]>;

  constructor(
    readonly slug: string,
    readonly registry: DictionaryRegistryEntry,
    private readonly _entities: ReadonlyMap<string, EntityNode>,
    private readonly _byCode: ReadonlyMap<string, EntityNode>,
    private readonly _byType: ReadonlyMap<EntityType, readonly EntityNode[]>,
    readonly classTree: ClassTreeNode[],
  ) {
    this.subclassesByIrdi = indexSubclasses(this);
    this.classesByPropertyIrdi = indexClassesByProperty(this);
    this.instancesByPowertypeIrdi = indexPowertypeInstances(this);
    this.relationsByDomainIrdi = indexRelationsByDomain(this);
    this.relationsByCodomainIrdi = indexRelationsByCodomain(this);
    this.propertiesByUnitIrdi = indexPropertiesByUnit(this);
    this.propertiesByValueListIrdi = indexPropertiesByValueList(this);
    this.declaredPropertiesByClassIrdi = indexDeclaredPropertiesByClass(this);
  }

  // ── Query methods — the deep interface ──────────────────────
  // Callers use these instead of reaching into _entities / _byCode /
  // _byType. The internal maps can change shape without breaking
  // callers. This is the leverage: one interface, many indexes behind it.

  find(irdi: string): EntityNode | undefined {
    return this._entities.get(irdi);
  }

  findByCode(code: string): EntityNode | undefined {
    return this._byCode.get(code);
  }

  hasEntity(irdi: string): boolean {
    return this._entities.has(irdi);
  }

  entitiesOfType(type: EntityType): readonly EntityNode[] {
    return this._byType.get(type) ?? EMPTY_ENTITIES;
  }

  entityCount(type: EntityType): number {
    return this._byType.get(type)?.length ?? 0;
  }

  get size(): number {
    return this._entities.size;
  }

  subclassesOf(irdi: string): readonly ClassNode[] {
    return this.subclassesByIrdi.get(irdi) ?? EMPTY_CLASSES;
  }

  classesDeclaringProperty(propertyIrdi: string): readonly ClassNode[] {
    return this.classesByPropertyIrdi.get(propertyIrdi) ?? EMPTY_CLASSES;
  }

  instancesOf(powertypeIrdi: string): readonly ClassNode[] {
    return this.instancesByPowertypeIrdi.get(powertypeIrdi) ?? EMPTY_CLASSES;
  }

  relationsForClass(classIrdi: string): readonly RelationNode[] {
    return this.relationsByDomainIrdi.get(classIrdi) ?? EMPTY_RELATIONS;
  }

  relationsForCodomainClass(classIrdi: string): readonly RelationNode[] {
    return this.relationsByCodomainIrdi.get(classIrdi) ?? EMPTY_RELATIONS;
  }

  propertiesForUnit(unitIrdi: string): readonly PropertyNode[] {
    return this.propertiesByUnitIrdi.get(unitIrdi) ?? EMPTY_PROPERTIES;
  }

  propertiesForValueList(valueListIrdi: string): readonly PropertyNode[] {
    return this.propertiesByValueListIrdi.get(valueListIrdi) ?? EMPTY_PROPERTIES;
  }

  propertiesByClassIrdi(classIrdi: string): readonly PropertyNode[] {
    return this.declaredPropertiesByClassIrdi.get(classIrdi) ?? EMPTY_PROPERTIES;
  }

  declaredPropertyCount(classIrdi: string): number {
    return this.declaredPropertiesByClassIrdi.get(classIrdi)?.length ?? 0;
  }

  search(rawQuery: string): readonly EntityNode[] {
    const query = normalizeSearchQuery(rawQuery);
    if (query.length === 0) return EMPTY_ENTITIES;
    const buckets = new Map<EntityType, EntityNode[]>();
    for (const node of this._entities.values()) {
      if (!entityMatches(node, query)) continue;
      const list = buckets.get(node.type) ?? [];
      list.push(node);
      buckets.set(node.type, list);
    }
    const out: EntityNode[] = [];
    for (const type of ENTITY_TYPE_ORDER_FOR_SEARCH) {
      const list = buckets.get(type);
      if (!list) continue;
      list.sort(byCodeAscending);
      out.push(...list);
      if (out.length >= SEARCH_RESULT_LIMIT) break;
    }
    if (out.length > SEARCH_RESULT_LIMIT) {
      return out.slice(0, SEARCH_RESULT_LIMIT);
    }
    return out;
  }

  ancestorChainOf(irdi: string): readonly ClassNode[] {
    const chain: ClassNode[] = [];
    const seen = new Set<string>();
    let current = this._entities.get(irdi);
    while (current && isClassNode(current) && !seen.has(current.irdi)) {
      seen.add(current.irdi);
      chain.unshift(current);
      const parentIrdi = current.superclass;
      current = parentIrdi ? this._entities.get(parentIrdi) : undefined;
    }
    return chain;
  }

  effectivePropertiesOf(irdi: string): EffectivePropertiesResult {
    const acc = new PropertyNodeAccumulator();
    const seen = new Set<string>();
    this.accumulateEffective(irdi, seen, acc);
    return acc.toResult();
  }

  /**
   * Splits an IRDI list into resolved entities and unresolved IRDIs.
   * Centralises the "filter by entities.has()" pattern that was
   * scattered across 6 detail pages. Returns { resolved, unresolved }
   * so callers can render resolved links + gray "not in browser data"
   * chips from one call.
   */
  resolveIrdis(irdis: readonly string[] | undefined): {
    resolved: EntityNode[];
    unresolved: string[];
  } {
    if (!irdis || irdis.length === 0) {
      return { resolved: [], unresolved: [] };
    }
    const resolved: EntityNode[] = [];
    const unresolved: string[] = [];
    for (const irdi of irdis) {
      const node = this._entities.get(irdi);
      if (node) {
        resolved.push(node);
      } else {
        unresolved.push(irdi);
      }
    }
    return { resolved, unresolved };
  }

  private accumulateEffective(
    classIrdi: string,
    seen: Set<string>,
    acc: PropertyNodeAccumulator,
  ): void {
    if (seen.has(classIrdi)) return;
    seen.add(classIrdi);
    const klass = this._entities.get(classIrdi);
    if (!klass || !isClassNode(klass)) return;

    this.collectProperties(klass.applicable_properties, klass, acc);
    this.collectProperties(klass.imported_properties, klass, acc);

    if (klass.superclass) this.accumulateEffective(klass.superclass, seen, acc);
    for (const ref of klass.is_case_of ?? [])
      this.accumulateEffective(ref, seen, acc);
  }

  private collectProperties(
    irdis: readonly string[] | undefined,
    klass: ClassNode,
    acc: PropertyNodeAccumulator,
  ): void {
    if (!irdis) return;
    for (const propIrdi of irdis) {
      const prop = this._entities.get(propIrdi);
      if (!prop || !isPropertyNode(prop)) continue;
      acc.add(prop, klass.irdi);
    }
  }
}

export interface EffectivePropertiesResult {
  readonly properties: readonly PropertyNode[];
  readonly sources: ReadonlyMap<string, readonly string[]>;
}

class PropertyNodeAccumulator {
  private readonly order: string[] = [];
  private readonly byIrdi = new Map<string, PropertyNode>();
  private readonly sources = new Map<string, string[]>();

  add(prop: PropertyNode, sourceClassIrdi: string): void {
    if (!this.byIrdi.has(prop.irdi)) {
      this.byIrdi.set(prop.irdi, prop);
      this.order.push(prop.irdi);
    }
    const list = this.sources.get(prop.irdi) ?? [];
    if (!list.includes(sourceClassIrdi)) list.push(sourceClassIrdi);
    this.sources.set(prop.irdi, list);
  }

  toResult(): EffectivePropertiesResult {
    const properties = this.order.map((irdi) => this.byIrdi.get(irdi)!);
    return { properties, sources: this.sources };
  }
}

function buildReverseIndex<E extends EntityNode>(
  bundle: Pick<DictionaryBundle, "entitiesOfType">,
  type: EntityType,
  extractKeys: (entity: E) => readonly string[] | undefined,
): Map<string, readonly E[]> {
  const out = new Map<string, E[]>();
  for (const node of bundle.entitiesOfType(type)) {
    if (node.type !== type) continue;
    const keys = extractKeys(node as E);
    if (!keys) continue;
    for (const key of keys) {
      const list = out.get(key) ?? [];
      list.push(node as E);
      out.set(key, list);
    }
  }
  for (const list of out.values()) {
    list.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
  }
  return out as unknown as Map<string, readonly E[]>;
}

function indexSubclasses(bundle: Pick<DictionaryBundle, "entitiesOfType">) {
  return buildReverseIndex<ClassNode>(
    bundle,
    "class",
    (k) => (k.superclass ? [k.superclass] : undefined),
  );
}

function indexClassesByProperty(bundle: Pick<DictionaryBundle, "entitiesOfType">) {
  return buildReverseIndex<ClassNode>(
    bundle,
    "class",
    (k) => k.applicable_properties,
  );
}

function indexPowertypeInstances(bundle: Pick<DictionaryBundle, "entitiesOfType">) {
  return buildReverseIndex<ClassNode>(bundle, "class", (k) => k.is_case_of);
}

function indexRelationsByDomain(bundle: Pick<DictionaryBundle, "entitiesOfType">) {
  return buildReverseIndex<RelationNode>(bundle, "relation", (r) => r.domain);
}

function indexRelationsByCodomain(bundle: Pick<DictionaryBundle, "entitiesOfType">) {
  return buildReverseIndex<RelationNode>(
    bundle,
    "relation",
    (r) => (r.codomain ? [r.codomain] : undefined),
  );
}

function indexPropertiesByUnit(bundle: Pick<DictionaryBundle, "entitiesOfType">) {
  return buildReverseIndex<PropertyNode>(
    bundle,
    "property",
    (p) => (p.unit ? [p.unit] : undefined),
  );
}

function indexPropertiesByValueList(bundle: Pick<DictionaryBundle, "entitiesOfType">) {
  return buildReverseIndex<PropertyNode>(
    bundle,
    "property",
    (p) => (p.value_list ? [p.value_list] : undefined),
  );
}

function indexDeclaredPropertiesByClass(
  bundle: Pick<DictionaryBundle, "entitiesOfType" | "find">,
): Map<string, readonly PropertyNode[]> {
  const out = new Map<string, PropertyNode[]>();
  for (const klass of bundle.entitiesOfType("class")) {
    if (klass.type !== "class") continue;
    const classNode = klass as ClassNode;
    const propIrdis = classNode.applicable_properties;
    if (!propIrdis || propIrdis.length === 0) continue;
    const bucket: PropertyNode[] = [];
    for (const propIrdi of propIrdis) {
      const prop = bundle.find(propIrdi);
      if (prop && isPropertyNode(prop)) bucket.push(prop);
    }
    if (bucket.length > 0) {
      bucket.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
      out.set(classNode.irdi, bucket);
    }
  }
  return out as unknown as Map<string, readonly PropertyNode[]>;
}

/**
 * Build a forest of class-tree nodes from a flat list of class JSON
 * nodes. Roots are classes with no `superclass` reference or whose
 * superclass is not present in the bundle.
 */
export function buildClassTree(
  classes: readonly EntityNode[],
): ClassTreeNode[] {
  const lookup = new Map<string, ClassTreeNode>();
  for (const node of classes) {
    if (node.type !== "class" || !node.irdi) continue;
    lookup.set(node.irdi, {
      irdi: node.irdi,
      code: node.code,
      name: node.preferred_name,
      classType: node.class_type,
      superclass: node.superclass,
      children: [],
    });
  }
  const roots: ClassTreeNode[] = [];
  for (const node of lookup.values()) {
    if (node.superclass && lookup.has(node.superclass)) {
      lookup.get(node.superclass)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  sortTree(roots);
  return roots;
}

function sortTree(nodes: ClassTreeNode[]): void {
  nodes.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
  for (const n of nodes) sortTree(n.children);
}
