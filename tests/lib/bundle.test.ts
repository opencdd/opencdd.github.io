import { beforeEach, describe, expect, it } from "vitest";
import { DictionaryBundle, buildClassTree } from "~/lib/bundle";
import type { EntityNode, EntityType } from "~/lib/types";
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
    buildClassTree(byType.get("class") ?? []),
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
});
