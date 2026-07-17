import { beforeEach, describe, expect, it } from "vitest";
import { buildClassPageData } from "~/lib/classPage";
import type { EntityNode, EntityType } from "~/lib/types";
import { DictionaryBundle } from "~/lib/bundle";
import { buildClassTree } from "~/lib/tree";
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
    buildClassTree((byType.get("class") ?? []) as any),
  );
}

const SLUG = "test";

describe("buildClassPageData", () => {
  beforeEach(() => resetFactories());

  it("returns empty stats for a leaf class with no properties", () => {
    const cls = makeClass({ code: "AAA001" });
    const bundle = buildBundle([cls]);

    const page = buildClassPageData(cls, bundle, SLUG);

    expect(page.stats).toEqual([
      { label: "Properties", value: 0, href: "#declared-properties" },
      { label: "Subclasses", value: 0, href: "#subclasses" },
    ]);
    expect(page.inherited).toHaveLength(0);
    expect(page.declared.properties).toHaveLength(0);
  });

  it("includes inherited count in stats when > 0", () => {
    const root = makeClass({ code: "AAA000" });
    const child = makeClass({
      code: "AAA001",
      superclass: root.irdi,
      applicable_properties: [],
    });
    const prop = makeProperty({ code: "AAD001" });
    root.applicable_properties = [prop.irdi];
    const bundle = buildBundle([root, child, prop]);

    const page = buildClassPageData(child, bundle, SLUG);

    expect(page.stats.some((s) => s.label === "Inherited")).toBe(true);
    expect(page.inherited.length).toBeGreaterThan(0);
  });

  it("computes subclasses from the bundle", () => {
    const parent = makeClass({ code: "AAA000" });
    const child1 = makeClass({ code: "AAA001", superclass: parent.irdi });
    const child2 = makeClass({ code: "AAA002", superclass: parent.irdi });
    const bundle = buildBundle([parent, child1, child2]);

    const page = buildClassPageData(parent, bundle, SLUG);

    expect(page.subclasses.nodes).toHaveLength(2);
    expect(page.subclasses.items).toHaveLength(2);
  });

  it("serializes declared property items with hrefs", () => {
    const prop = makeProperty({ code: "AAD001", preferred_name: "Rated voltage" });
    const cls = makeClass({
      code: "AAA001",
      applicable_properties: [prop.irdi],
    });
    const bundle = buildBundle([cls, prop]);

    const page = buildClassPageData(cls, bundle, SLUG);

    expect(page.declared.properties).toHaveLength(1);
    expect(page.declared.items).toHaveLength(1);
    expect(page.declared.items[0]!.href).toBe("/d/test/p/AAD001");
    expect(page.declared.items[0]!.name).toBe("Rated voltage");
  });

  it("computes ancestor chain for breadcrumbs", () => {
    const root = makeClass({ code: "AAA000" });
    const mid = makeClass({ code: "AAA001", superclass: root.irdi });
    const leaf = makeClass({ code: "AAA002", superclass: mid.irdi });
    const bundle = buildBundle([root, mid, leaf]);

    const page = buildClassPageData(leaf, bundle, SLUG);

    expect(page.ancestorCrumbs).toHaveLength(3);
    expect(page.ancestorCrumbs[0]!.irdi).toBe(root.irdi);
    expect(page.higherLevel).toHaveLength(2);
  });

  it("tracks unresolved superclass", () => {
    const cls = makeClass({
      code: "AAA001",
      superclass: "missing-superclass-irdi",
    });
    const bundle = buildBundle([cls]);

    const page = buildClassPageData(cls, bundle, SLUG);

    expect(page.unresolvedSuperclass).toEqual(["missing-superclass-irdi"]);
  });

  it("serializes relations as domain and codomain", () => {
    const cls = makeClass({ code: "AAA001" });
    const target = makeClass({ code: "AAA002" });
    const rel = makeRelation({
      code: "AAR001",
      domain: [cls.irdi],
      codomain: target.irdi,
    });
    const bundle = buildBundle([cls, target, rel]);

    const page = buildClassPageData(cls, bundle, SLUG);

    expect(page.relationsAsDomain.nodes).toHaveLength(1);
    expect(page.relationsAsCodomain.nodes).toHaveLength(0);
  });

  it("serializes codomain references", () => {
    const cls = makeClass({ code: "AAA001" });
    const source = makeClass({ code: "AAA002" });
    const rel = makeRelation({
      code: "AAR001",
      domain: [source.irdi],
      codomain: cls.irdi,
    });
    const bundle = buildBundle([cls, source, rel]);

    const page = buildClassPageData(cls, bundle, SLUG);

    expect(page.relationsAsCodomain.nodes).toHaveLength(1);
    expect(page.relationsAsDomain.nodes).toHaveLength(0);
  });

  it("activates filter for large subclass lists", () => {
    const parent = makeClass({ code: "AAA000" });
    const children = Array.from({ length: 15 }, (_, i) =>
      makeClass({ code: `AAA${String(i + 1).padStart(3, "0")}`, superclass: parent.irdi }),
    );
    const bundle = buildBundle([parent, ...children]);

    const page = buildClassPageData(parent, bundle, SLUG);

    expect(page.subclasses.useFilter).toBe(true);
    expect(page.subclasses.items).toHaveLength(15);
  });

  it("does not activate filter for small lists", () => {
    const parent = makeClass({ code: "AAA000" });
    const child = makeClass({ code: "AAA001", superclass: parent.irdi });
    const bundle = buildBundle([parent, child]);

    const page = buildClassPageData(parent, bundle, SLUG);

    expect(page.subclasses.useFilter).toBe(false);
  });
});
