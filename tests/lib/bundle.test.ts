import { beforeEach, describe, expect, it } from "vitest";
import { DictionaryBundle } from "~/lib/bundle";
import { buildClassTree } from "~/lib/tree";
import type { EntityNode, EntityType, ClassNode } from "~/lib/types";
import type { DictionaryRegistryEntry } from "~/lib/registry";
import {
  makeClass,
  makeProperty,
  makeRelation,
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
    buildClassTree((byType.get("class") ?? []) as ClassNode[]),
  );
}

describe("DictionaryBundle", () => {
  beforeEach(() => resetFactories());

  describe("subclassesOf", () => {
    it("returns direct subclasses", () => {
      const root = makeClass({ code: "AAA000" });
      const child1 = makeClass({ code: "AAA001", superclass: root.irdi });
      const child2 = makeClass({ code: "AAA002", superclass: root.irdi });
      const bundle = buildBundle([root, child1, child2]);
      const subs = bundle.subclassesOf(root.irdi);
      expect(subs.map((s) => s.code)).toEqual(["AAA001", "AAA002"]);
    });

    it("returns empty for a class with no subclasses", () => {
      const root = makeClass({ code: "AAA000" });
      const bundle = buildBundle([root]);
      expect(bundle.subclassesOf(root.irdi)).toEqual([]);
    });
  });

  describe("ancestorChainOf", () => {
    it("walks superclass pointers from self to root", () => {
      const root = makeClass({ code: "AAA000" });
      const mid = makeClass({ code: "AAA001", superclass: root.irdi });
      const leaf = makeClass({ code: "AAA002", superclass: mid.irdi });
      const bundle = buildBundle([root, mid, leaf]);
      const chain = bundle.ancestorChainOf(leaf.irdi);
      expect(chain.map((c) => c.code)).toEqual(["AAA000", "AAA001", "AAA002"]);
    });

    it("is cycle-safe", () => {
      const a = makeClass({ code: "AAA000", superclass: "AAA002" });
      const b = makeClass({ code: "AAA002", superclass: a.irdi });
      const bundle = buildBundle([a, b]);
      const chain = bundle.ancestorChainOf(a.irdi);
      expect(chain.length).toBeGreaterThan(0);
      expect(chain.length).toBeLessThan(5);
    });
  });

  describe("effectivePropertiesOf", () => {
    it("includes properties from superclass chain", () => {
      const parentProp = makeProperty({ code: "AAAP00" });
      const childProp = makeProperty({ code: "AAAP01" });
      const parent = makeClass({
        code: "AAA000",
        applicable_properties: [parentProp.irdi],
      });
      const child = makeClass({
        code: "AAA001",
        superclass: parent.irdi,
        applicable_properties: [childProp.irdi],
      });
      const bundle = buildBundle([parent, child, parentProp, childProp]);
      const eff = bundle.effectivePropertiesOf(child.irdi);
      expect(eff.properties.map((p) => p.code).sort()).toEqual([
        "AAAP00",
        "AAAP01",
      ]);
    });
  });

  describe("relationsForClass and relationsForCodomainClass", () => {
    it("returns relations where the class is in domain and codomain respectively", () => {
      const a = makeClass({ code: "AAA000" });
      const b = makeClass({ code: "AAA001" });
      const rel = makeRelation({
        code: "AAAR00",
        domain: [a.irdi],
        codomain: b.irdi,
      });
      const bundle = buildBundle([a, b, rel]);
      expect(bundle.relationsForClass(a.irdi).map((r) => r.code)).toEqual([
        "AAAR00",
      ]);
      expect(
        bundle.relationsForCodomainClass(b.irdi).map((r) => r.code),
      ).toEqual(["AAAR00"]);
    });
  });

  describe("find / findByCode / hasEntity / entitiesOfType / entityCount", () => {
    it("find returns the entity by IRDI", () => {
      const c = makeClass({ code: "AAA000" });
      const bundle = buildBundle([c]);
      expect(bundle.find(c.irdi)?.code).toBe("AAA000");
    });

    it("find returns undefined for an unknown IRDI", () => {
      const bundle = buildBundle([]);
      expect(bundle.find("does-not-exist")).toBeUndefined();
    });

    it("findByCode returns the entity by code", () => {
      const c = makeClass({ code: "AAA000" });
      const bundle = buildBundle([c]);
      expect(bundle.findByCode("AAA000")?.irdi).toBe(c.irdi);
    });

    it("hasEntity returns true for present, false for absent", () => {
      const c = makeClass({ code: "AAA000" });
      const bundle = buildBundle([c]);
      expect(bundle.hasEntity(c.irdi)).toBe(true);
      expect(bundle.hasEntity("nope")).toBe(false);
    });

    it("entitiesOfType filters by type", () => {
      const c = makeClass({ code: "AAA000" });
      const p = makeProperty({ code: "AAAP00" });
      const bundle = buildBundle([c, p]);
      expect(bundle.entitiesOfType("class").map((e) => e.code)).toEqual(["AAA000"]);
      expect(bundle.entitiesOfType("property").map((e) => e.code)).toEqual(["AAAP00"]);
      expect(bundle.entitiesOfType("unit")).toEqual([]);
    });

    it("entityCount returns per-type counts", () => {
      const c1 = makeClass({ code: "AAA001" });
      const c2 = makeClass({ code: "AAA002" });
      const p = makeProperty({ code: "AAAP00" });
      const bundle = buildBundle([c1, c2, p]);
      expect(bundle.entityCount("class")).toBe(2);
      expect(bundle.entityCount("property")).toBe(1);
      expect(bundle.entityCount("unit") ?? 0).toBe(0);
    });
  });

  describe("instancesOf (powertype)", () => {
    it("returns categorical-class instances of a powertype", () => {
      const powertype = makeClass({
        code: "AAA000",
        class_type: "CATEGORICAL_CLASS",
      });
      const instance1 = makeClass({
        code: "AAA001",
        is_case_of: [powertype.irdi],
      });
      const instance2 = makeClass({
        code: "AAA002",
        is_case_of: [powertype.irdi],
      });
      const unrelated = makeClass({ code: "AAA003" });
      const bundle = buildBundle([powertype, instance1, instance2, unrelated]);
      const instances = bundle.instancesOf(powertype.irdi);
      expect(instances.map((i) => i.code).sort()).toEqual(["AAA001", "AAA002"]);
    });
  });

  describe("classesDeclaringProperty", () => {
    it("returns classes whose applicable_properties includes the property IRDI", () => {
      const prop = makeProperty({ code: "AAAP00" });
      const a = makeClass({
        code: "AAA000",
        applicable_properties: [prop.irdi],
      });
      const b = makeClass({
        code: "AAA001",
        applicable_properties: [prop.irdi],
      });
      const c = makeClass({ code: "AAA002" });
      const bundle = buildBundle([a, b, c, prop]);
      const decls = bundle.classesDeclaringProperty(prop.irdi);
      expect(decls.map((d) => d.code).sort()).toEqual(["AAA000", "AAA001"]);
    });
  });

  describe("propertiesForUnit and propertiesForValueList", () => {
    it("returns properties referencing a unit", () => {
      const unit = { type: "unit", irdi: "AAA001", code: "AAA001" } as const;
      const p = makeProperty({ code: "AAAP00", unit: unit.irdi });
      const bundle = buildBundle([p, unit as unknown as EntityNode]);
      expect(bundle.propertiesForUnit(unit.irdi).map((x) => x.code)).toEqual([
        "AAAP00",
      ]);
    });

    it("returns properties referencing a value list", () => {
      const vl = {
        type: "value_list",
        irdi: "AAV001",
        code: "AAV001",
      } as const;
      const p = makeProperty({ code: "AAAP00", value_list: vl.irdi });
      const bundle = buildBundle([p, vl as unknown as EntityNode]);
      expect(
        bundle.propertiesForValueList(vl.irdi).map((x) => x.code),
      ).toEqual(["AAAP00"]);
    });
  });

  describe("resolveIrdis", () => {
    it("partitions into resolved and unresolved", () => {
      const p1 = makeProperty({ code: "AAAP01" });
      const p2 = makeProperty({ code: "AAAP02" });
      const bundle = buildBundle([p1, p2]);
      const result = bundle.resolveIrdis([p1.irdi, "unknown-irdi", p2.irdi]);
      expect(result.resolved.map((p) => p.code).sort()).toEqual([
        "AAAP01",
        "AAAP02",
      ]);
      expect(result.unresolved).toEqual(["unknown-irdi"]);
    });

    it("returns empty for undefined input", () => {
      const bundle = buildBundle([]);
      const result = bundle.resolveIrdis(undefined);
      expect(result.resolved).toEqual([]);
      expect(result.unresolved).toEqual([]);
    });
  });

  describe("search", () => {
    it("matches by preferred_name", () => {
      const c = makeClass({ code: "AAA000", preferred_name: "capacitor" });
      const bundle = buildBundle([c]);
      const results = bundle.search("capac");
      expect(results.map((r) => r.code)).toContain("AAA000");
    });

    it("matches by code", () => {
      const c = makeClass({ code: "AAA000" });
      const bundle = buildBundle([c]);
      const results = bundle.search("AAA000");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for no matches", () => {
      const c = makeClass({ code: "AAA000" });
      const bundle = buildBundle([c]);
      expect(bundle.search("zzz-no-match")).toEqual([]);
    });
  });
});
