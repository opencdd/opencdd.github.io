import { beforeEach, describe, expect, it } from "vitest";
import { resolveEntityRef } from "~/lib/entityRef";
import type { EntityNode, EntityType } from "~/lib/types";
import { DictionaryBundle } from "~/lib/bundle";
import { buildClassTree } from "~/lib/tree";
import type { DictionaryRegistryEntry } from "~/lib/registry";
import {
  makeClass,
  makeProperty,
  makeUnit,
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

describe("resolveEntityRef", () => {
  beforeEach(() => resetFactories());

  it("resolves a class with correct href segment", () => {
    const cls = makeClass({ code: "AAA001", preferred_name: "Electrical appliance" });
    const bundle = buildBundle([cls]);

    const ref = resolveEntityRef(cls.irdi, bundle, SLUG);

    expect(ref).toEqual({
      code: "AAA001",
      name: "Electrical appliance",
      href: "/d/test/c/AAA001",
      resolved: true,
    });
  });

  it("resolves a property with /p/ segment", () => {
    const prop = makeProperty({ code: "AAD009", preferred_name: "Frequency" });
    const bundle = buildBundle([prop]);

    const ref = resolveEntityRef(prop.irdi, bundle, SLUG);

    expect(ref.href).toBe("/d/test/p/AAD009");
  });

  it("resolves a unit with /u/ segment", () => {
    const unit = makeUnit({ code: "AAU001", preferred_name: "Volt" });
    const bundle = buildBundle([unit]);

    const ref = resolveEntityRef(unit.irdi, bundle, SLUG);

    expect(ref.href).toBe("/d/test/u/AAU001");
  });

  it("falls back to codeFromIrdi when node has no code", () => {
    const prop = makeProperty({ irdi: "0112/2///61360_4#AAA001" });
    delete (prop as any).code;
    delete (prop as any).preferred_name;
    const bundle = buildBundle([prop]);

    const ref = resolveEntityRef(prop.irdi, bundle, SLUG);

    expect(ref.code).toBe("AAA001");
    expect(ref.name).toBe("AAA001");
  });

  it("returns resolved=false for missing IRDIs", () => {
    const bundle = buildBundle([]);

    const ref = resolveEntityRef("nonexistent", bundle, SLUG);

    expect(ref).toEqual({
      code: "nonexistent",
      name: "nonexistent",
      href: null,
      resolved: false,
    });
  });

  it("uses preferred_name for display when available", () => {
    const cls = makeClass({ code: "AAA001", preferred_name: "Rated voltage" });
    const bundle = buildBundle([cls]);

    const ref = resolveEntityRef(cls.irdi, bundle, SLUG);

    expect(ref.name).toBe("Rated voltage");
    expect(ref.code).toBe("AAA001");
  });

  it("falls back to code when preferred_name missing", () => {
    const cls = makeClass({ code: "AAA001" });
    delete (cls as any).preferred_name;
    const bundle = buildBundle([cls]);

    const ref = resolveEntityRef(cls.irdi, bundle, SLUG);

    expect(ref.name).toBe("AAA001");
  });
});
