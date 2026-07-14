import { beforeEach, describe, expect, it } from "vitest";
import {
  toEntityListItem,
  toEntityListItems,
  toPropertyListItem,
  toPropertyListItems,
} from "~/lib/listItems";
import type { EntityNode, EntityType } from "~/lib/types";
import { DictionaryBundle } from "~/lib/bundle";
import { buildClassTree } from "~/lib/tree";
import type { DictionaryRegistryEntry } from "~/lib/registry";
import {
  makeClass,
  makeProperty,
  makeUnit,
  makeValueList,
  resetFactories,
} from "../helpers/factories";

function buildBundle(nodes: EntityNode[]): DictionaryBundle {
  const byType = new Map<EntityType, EntityNode[]>();
  const byCode = new Map<string, EntityNode>();
  const entities = new Map<string, EntityNode>();
  for (const n of nodes) {
    entities.set(n.irdi, n);
    if (n.code) byCode.set(n.code, n);
    const list = byType.get(n.type) ?? [];
    list.push(n);
    byType.set(n.type, list);
  }
  const registry: DictionaryRegistryEntry = {
    slug: "test",
    parcelId: "TEST",
    title: "Test",
    sourceLanguage: "en",
    translationLanguages: [],
    counts: {},
    metaClassIrdis: [],
  };
  return new DictionaryBundle(
    "test",
    registry,
    entities,
    byCode,
    byType,
    buildClassTree((byType.get("class") ?? []) as any),
  );
}

const SLUG = "test";

describe("toEntityListItem", () => {
  beforeEach(() => resetFactories());

  it("resolves a class to a linkable item with href", () => {
    const cls = makeClass({ code: "AAA001", preferred_name: "Rated voltage" });
    const bundle = buildBundle([cls]);

    const item = toEntityListItem(cls.irdi, bundle, SLUG);

    expect(item).toEqual({
      code: "AAA001",
      name: "Rated voltage",
      href: "/d/test/c/AAA001",
      resolved: true,
      definition: null,
    });
  });

  it("resolves a property to a href with /p/ segment", () => {
    const prop = makeProperty({ code: "AAD009", preferred_name: "Frequency" });
    const bundle = buildBundle([prop]);

    const item = toEntityListItem(prop.irdi, bundle, SLUG);

    expect(item.href).toBe("/d/test/p/AAD009");
    expect(item.resolved).toBe(true);
  });

  it("resolves a unit to a href with /u/ segment", () => {
    const unit = makeUnit({ code: "AAU001", preferred_name: "Volt" });
    const bundle = buildBundle([unit]);

    const item = toEntityListItem(unit.irdi, bundle, SLUG);

    expect(item.href).toBe("/d/test/u/AAU001");
  });

  it("falls back to codeFromIrdi when node has no code", () => {
    const prop = makeProperty({ irdi: "0112/2///61360_4#AAA001" });
    delete (prop as any).code;
    delete (prop as any).preferred_name;
    const bundle = buildBundle([prop]);

    const item = toEntityListItem(prop.irdi, bundle, SLUG);

    expect(item.code).toBe("AAA001");
    expect(item.name).toBe("AAA001");
  });

  it("marks unresolved IRDIs with null href and resolved=false", () => {
    const bundle = buildBundle([]);

    const item = toEntityListItem("missing-irdi", bundle, SLUG);

    expect(item).toEqual({
      code: "missing-irdi",
      name: "missing-irdi",
      href: null,
      resolved: false,
      definition: null,
    });
  });
});

describe("toEntityListItems", () => {
  beforeEach(() => resetFactories());

  it("serializes a batch of IRDIs preserving order", () => {
    const cls1 = makeClass({ code: "AAA001" });
    const cls2 = makeClass({ code: "AAA002" });
    const bundle = buildBundle([cls1, cls2]);

    const items = toEntityListItems([cls1.irdi, cls2.irdi], bundle, SLUG);

    expect(items).toHaveLength(2);
    expect(items[0]!.code).toBe("AAA001");
    expect(items[1]!.code).toBe("AAA002");
  });

  it("handles mixed resolved and unresolved IRDIs", () => {
    const cls = makeClass({ code: "AAA001" });
    const bundle = buildBundle([cls]);

    const items = toEntityListItems([cls.irdi, "missing"], bundle, SLUG);

    expect(items).toHaveLength(2);
    expect(items[0]!.resolved).toBe(true);
    expect(items[1]!.resolved).toBe(false);
    expect(items[1]!.href).toBeNull();
  });
});

describe("toPropertyListItem", () => {
  beforeEach(() => resetFactories());

  it("serializes a property with full definition", () => {
    const prop = makeProperty({
      code: "AAD009",
      preferred_name: "Frequency",
      definition: "The number of cycles per second.",
      data_type: "REAL_MEASURE_TYPE",
    });
    const bundle = buildBundle([prop]);

    const item = toPropertyListItem(prop, bundle, SLUG);

    expect(item.code).toBe("AAD009");
    expect(item.name).toBe("Frequency");
    expect(item.href).toBe("/d/test/p/AAD009");
    expect(item.definition).toBe("The number of cycles per second.");
    expect(item.dataTypeLabel).toBe("REAL_MEASURE_TYPE");
  });

  it("resolves the unit name and href", () => {
    const unit = makeUnit({ code: "AAU001", preferred_name: "Volt" });
    const prop = makeProperty({
      code: "AAD010",
      preferred_name: "Voltage",
      unit: unit.irdi,
      data_type: "REAL_MEASURE_TYPE",
    });
    const bundle = buildBundle([unit, prop]);

    const item = toPropertyListItem(prop, bundle, SLUG);

    expect(item.unitName).toBe("Volt");
    expect(item.unitHref).toBe("/d/test/u/AAU001");
  });

  it("sets unitName to null when property has no unit", () => {
    const prop = makeProperty({ code: "AAD011", data_type: "STRING_TYPE" });
    const bundle = buildBundle([prop]);

    const item = toPropertyListItem(prop, bundle, SLUG);

    expect(item.unitName).toBeNull();
    expect(item.unitHref).toBeNull();
  });

  it("sets unitName from unit code when preferred_name is missing", () => {
    const unit = makeUnit({ code: "AAU002" });
    delete (unit as any).preferred_name;
    const prop = makeProperty({ code: "AAD012", unit: unit.irdi });
    const bundle = buildBundle([unit, prop]);

    const item = toPropertyListItem(prop, bundle, SLUG);

    expect(item.unitName).toBe("AAU002");
  });

  it("parses enum data type label", () => {
    const valueList = makeValueList({ code: "AAV001" });
    const prop = makeProperty({
      code: "AAD013",
      data_type: "ENUM_STRING_TYPE(AAV001)",
    });
    const bundle = buildBundle([valueList, prop]);

    const item = toPropertyListItem(prop, bundle, SLUG);

    expect(item.dataTypeLabel).toBe("ENUM_STRING_TYPE");
  });

  it("parses class reference data type label", () => {
    const targetClass = makeClass({ code: "AAA099" });
    const prop = makeProperty({
      code: "AAD014",
      data_type: "CLASS_REFERENCE(AAA099)",
    });
    const bundle = buildBundle([targetClass, prop]);

    const item = toPropertyListItem(prop, bundle, SLUG);

    expect(item.dataTypeLabel).toBe("CLASS_REFERENCE");
  });

  it("sets dataTypeLabel to null when property has no data type", () => {
    const prop = makeProperty({ code: "AAD015", data_type: undefined });
    const bundle = buildBundle([prop]);

    const item = toPropertyListItem(prop, bundle, SLUG);

    expect(item.dataTypeLabel).toBeNull();
  });

  it("sets definition to null when missing", () => {
    const prop = makeProperty({ code: "AAD016", definition: undefined });
    const bundle = buildBundle([prop]);

    const item = toPropertyListItem(prop, bundle, SLUG);

    expect(item.definition).toBeNull();
  });

  it("falls back to code when preferred_name is missing", () => {
    const prop = makeProperty({ code: "AAD017" });
    delete (prop as any).preferred_name;
    const bundle = buildBundle([prop]);

    const item = toPropertyListItem(prop, bundle, SLUG);

    expect(item.name).toBe("AAD017");
  });
});

describe("toPropertyListItems", () => {
  beforeEach(() => resetFactories());

  it("serializes a batch of properties preserving order", () => {
    const p1 = makeProperty({ code: "AAD001" });
    const p2 = makeProperty({ code: "AAD002" });
    const bundle = buildBundle([p1, p2]);

    const items = toPropertyListItems([p1, p2], bundle, SLUG);

    expect(items).toHaveLength(2);
    expect(items[0]!.code).toBe("AAD001");
    expect(items[1]!.code).toBe("AAD002");
  });
});
