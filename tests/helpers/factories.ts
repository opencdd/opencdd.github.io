import type { ClassNode, EntityNode, EntityType, PropertyNode, RelationNode, UnitNode, ValueListNode, ValueTermNode } from "~/lib/types";

let counter = 0;
function next(prefix: string): string {
  counter += 1;
  return `${prefix}${String(counter).padStart(3, "0")}`;
}

export function resetFactories(): void {
  counter = 0;
}

export function makeClass(overrides: Partial<ClassNode> = {}): ClassNode {
  const code = overrides.code ?? next("AAA");
  return {
    type: "class",
    irdi: overrides.irdi ?? code,
    code,
    preferred_name: overrides.preferred_name ?? `Class ${code}`,
    definition: overrides.definition,
    class_type: overrides.class_type ?? "ITEM_CLASS",
    superclass: overrides.superclass,
    is_case_of: overrides.is_case_of,
    applicable_properties: overrides.applicable_properties,
    imported_properties: overrides.imported_properties,
    sub_class_selection: overrides.sub_class_selection,
    synonyms: overrides.synonyms,
    note: overrides.note,
    remark: overrides.remark,
    description: overrides.description,
    example: overrides.example,
    source_document: overrides.source_document,
    guid: overrides.guid,
    version: overrides.version,
    revision: overrides.revision,
    time_stamp: overrides.time_stamp,
    dates: overrides.dates,
  };
}

export function makeProperty(overrides: Partial<PropertyNode> = {}): PropertyNode {
  const code = overrides.code ?? next("AAAP");
  return {
    type: "property",
    irdi: overrides.irdi ?? code,
    code,
    preferred_name: overrides.preferred_name ?? `Property ${code}`,
    definition: overrides.definition,
    data_type: overrides.data_type,
    unit: overrides.unit,
    value_list: overrides.value_list,
    condition: overrides.condition,
    formula: overrides.formula,
    symbol: overrides.symbol,
    value_format: overrides.value_format,
    synonyms: overrides.synonyms,
    note: overrides.note,
    source_document: overrides.source_document,
  };
}

export function makeValueList(overrides: Partial<ValueListNode> = {}): ValueListNode {
  const code = overrides.code ?? next("AAAV");
  return {
    type: "value_list",
    irdi: overrides.irdi ?? code,
    code,
    preferred_name: overrides.preferred_name ?? `Value list ${code}`,
    definition: overrides.definition,
    list_type: overrides.list_type,
    term_irdis: overrides.term_irdis,
  };
}

export function makeValueTerm(overrides: Partial<ValueTermNode> = {}): ValueTermNode {
  const code = overrides.code ?? next("AAAT");
  return {
    type: "value_term",
    irdi: overrides.irdi ?? code,
    code,
    preferred_name: overrides.preferred_name ?? `Value term ${code}`,
    definition: overrides.definition,
    enumeration_code: overrides.enumeration_code ?? code,
    value_list: overrides.value_list,
  };
}

export function makeUnit(overrides: Partial<UnitNode> = {}): UnitNode {
  const code = overrides.code ?? next("AAAU");
  return {
    type: "unit",
    irdi: overrides.irdi ?? code,
    code,
    preferred_name: overrides.preferred_name ?? `Unit ${code}`,
    definition: overrides.definition,
    symbol: overrides.symbol,
  };
}

export function makeRelation(overrides: Partial<RelationNode> = {}): RelationNode {
  const code = overrides.code ?? next("AAAR");
  return {
    type: "relation",
    irdi: overrides.irdi ?? code,
    code,
    preferred_name: overrides.preferred_name ?? `Relation ${code}`,
    relation_type: overrides.relation_type,
    domain: overrides.domain,
    codomain: overrides.codomain,
  };
}

export function makeBundle(entities: EntityNode[]) {
  // Local import to avoid circular in factory module load order.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return makeBundleImpl(entities);
}

async function makeBundleImpl(entities: EntityNode[]) {
  const { DictionaryBundle, buildClassTree } = await import("~/lib/bundle");
  const byCode = new Map<string, EntityNode>();
  const byType = new Map<EntityType, EntityNode[]>();
  for (const e of entities) {
    if (e.code) byCode.set(e.code, e);
    const list = byType.get(e.type) ?? [];
    list.push(e);
    byType.set(e.type, list);
  }
  const entitiesMap = new Map<string, EntityNode>();
  for (const e of entities) entitiesMap.set(e.irdi, e);
  const registry = {
    slug: "test",
    parcelId: "TEST",
    title: "Test dictionary",
    sourceLanguage: "en",
    translationLanguages: [],
    counts: {},
    metaClassIrdis: [],
  };
  return new DictionaryBundle(
    "test",
    registry,
    entitiesMap,
    byCode,
    byType,
    buildClassTree(byType.get("class") ?? []),
  );
}
