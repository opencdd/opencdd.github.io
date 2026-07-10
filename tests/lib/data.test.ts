// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let sandboxDir: string;

beforeAll(() => {
  sandboxDir = mkdtempSync(join(tmpdir(), "cdd-data-test-"));
  const index = {
    dictionaries: [
      {
        slug: "sampledict",
        parcelId: "SAMPLE",
        title: "Sample",
        sourceLanguage: "en",
        translationLanguages: ["de", "fr"],
        counts: { class: 2, property: 2, value_list: 0, value_term: 0, unit: 0, relation: 0, view_control: 0 },
        metaClassIrdis: [],
      },
    ],
  };
  mkdirSync(join(sandboxDir, "sampledict"), { recursive: true });
  writeFileSync(join(sandboxDir, "index.json"), JSON.stringify(index));

  const nodes = [
    { irdi: "X#A", code: "A", preferred_name: "Class A", type: "class", superclass: null, class_type: "ITEM_CLASS" },
    { irdi: "X#B", code: "B", preferred_name: "Class B", type: "class", superclass: "X#A", class_type: "ITEM_CLASS" },
    { irdi: "X#PA", code: "PA", preferred_name: "Prop A", type: "property", data_type: "STRING_TYPE" },
    { irdi: "X#PB", code: "PB", preferred_name: "Prop B", type: "property", data_type: "STRING_TYPE" },
  ];
  writeFileSync(join(sandboxDir, "sampledict", "database.json"), JSON.stringify(nodes));
});

afterAll(() => {
  if (sandboxDir) rmSync(sandboxDir, { recursive: true, force: true });
});

describe("data loader (sandbox via configureDataRoot)", () => {
  it("loads the registry index", async () => {
    const { configureDataRoot, loadRegistry } = await import("~/lib/data");
    configureDataRoot(sandboxDir);
    const reg = loadRegistry();
    expect(reg.dictionaries).toHaveLength(1);
    expect(reg.dictionaries[0]?.slug).toBe("sampledict");
  });

  it("loads a single dictionary", async () => {
    const { configureDataRoot, loadDictionary } = await import("~/lib/data");
    configureDataRoot(sandboxDir);
    const bundle = loadDictionary("sampledict");
    expect(bundle.slug).toBe("sampledict");
    expect(bundle.entities.size).toBe(4);
  });

  it("indexes by irdi and code", async () => {
    const { configureDataRoot, loadDictionary } = await import("~/lib/data");
    configureDataRoot(sandboxDir);
    const bundle = loadDictionary("sampledict");
    expect(bundle.entities.get("X#A")?.code).toBe("A");
    expect(bundle.byCode.get("PA")?.irdi).toBe("X#PA");
  });

  it("indexes by type", async () => {
    const { configureDataRoot, loadDictionary } = await import("~/lib/data");
    configureDataRoot(sandboxDir);
    const bundle = loadDictionary("sampledict");
    expect(bundle.byType.get("class")).toHaveLength(2);
    expect(bundle.byType.get("property")).toHaveLength(2);
    expect(bundle.byType.get("unit")).toBeUndefined();
  });

  it("throws on unknown slug", async () => {
    const { configureDataRoot, loadDictionary } = await import("~/lib/data");
    configureDataRoot(sandboxDir);
    expect(() => loadDictionary("nosuchdict")).toThrow(/unknown dictionary slug/);
  });

  it("lists registry entries", async () => {
    const { configureDataRoot, listRegistryEntries } = await import("~/lib/data");
    configureDataRoot(sandboxDir);
    const entries = listRegistryEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.slug).toBe("sampledict");
  });

  it("enumerates entities by type across dictionaries", async () => {
    const { configureDataRoot, enumerateEntitiesByType } = await import("~/lib/data");
    configureDataRoot(sandboxDir);
    const classes = Array.from(enumerateEntitiesByType("class"));
    expect(classes).toHaveLength(2);
    expect(classes.map((c) => c.node.code).sort()).toEqual(["A", "B"]);
  });

  it("resolveIrdis splits resolved and unresolved", async () => {
    const { configureDataRoot, loadDictionary } = await import("~/lib/data");
    configureDataRoot(sandboxDir);
    const bundle = loadDictionary("sampledict");
    const { resolved, unresolved } = bundle.resolveIrdis(["X#A", "X#MISSING", "X#PA"]);
    expect(resolved).toHaveLength(2);
    expect(resolved.map((n) => n.code)).toEqual(["A", "PA"]);
    expect(unresolved).toEqual(["X#MISSING"]);
  });
});
