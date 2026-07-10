// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Each test process gets its own DATA dir so we don't depend on the
// real src/content/data/ (which has many MB of scrape JSON).
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

  vi.resetModules();
  vi.doMock("node:path", async (importOriginal) => {
    const orig = await importOriginal<typeof import("node:path")>();
    return {
      ...orig,
      resolve: (...args: string[]) => {
        // If resolving relative to cwd (process.cwd() + path), rewrite
        // the data root to our sandbox.
        if (args[0] === process.cwd() && args[1] === "src/content/data") {
          return sandboxDir;
        }
        return orig.resolve(...args);
      },
    };
  });
});

afterAll(() => {
  if (sandboxDir) rmSync(sandboxDir, { recursive: true, force: true });
  vi.doUnmock("node:path");
});

describe("data loader (sandbox)", () => {
  it("loads the registry index", async () => {
    const { loadRegistry } = await import("~/lib/data");
    const reg = loadRegistry();
    expect(reg.dictionaries).toHaveLength(1);
    expect(reg.dictionaries[0]?.slug).toBe("sampledict");
  });

  it("loads a single dictionary", async () => {
    const { loadDictionary } = await import("~/lib/data");
    const bundle = loadDictionary("sampledict");
    expect(bundle.slug).toBe("sampledict");
    expect(bundle.entities.size).toBe(4);
  });

  it("indexes by irdi and code", async () => {
    const { loadDictionary } = await import("~/lib/data");
    const bundle = loadDictionary("sampledict");
    expect(bundle.entities.get("X#A")?.code).toBe("A");
    expect(bundle.byCode.get("PA")?.irdi).toBe("X#PA");
  });

  it("indexes by type", async () => {
    const { loadDictionary } = await import("~/lib/data");
    const bundle = loadDictionary("sampledict");
    expect(bundle.byType.get("class")).toHaveLength(2);
    expect(bundle.byType.get("property")).toHaveLength(2);
    // Types not present in the data are undefined (the index only
    // has entries for types that have at least one node).
    expect(bundle.byType.get("unit")).toBeUndefined();
  });

  it("throws on unknown slug", async () => {
    const { loadDictionary } = await import("~/lib/data");
    expect(() => loadDictionary("nosuchdict")).toThrow(/unknown dictionary slug/);
  });

  it("lists registry entries", async () => {
    const { listRegistryEntries } = await import("~/lib/data");
    const entries = listRegistryEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.slug).toBe("sampledict");
  });

  it("enumerates entities by type across dictionaries", async () => {
    const { enumerateEntitiesByType } = await import("~/lib/data");
    const classes = Array.from(enumerateEntitiesByType("class"));
    expect(classes).toHaveLength(2);
    expect(classes.map((c) => c.node.code).sort()).toEqual(["A", "B"]);
  });
});
