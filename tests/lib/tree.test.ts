import { describe, expect, it } from "vitest";
import { buildFlatTree } from "~/lib/tree";
import type { DictionaryBundle } from "~/lib/bundle";

// Minimal bundle stub with the only method buildFlatTree uses.
function makeBundle(classTree: any): Pick<DictionaryBundle, "classTree" | "declaredPropertyCount"> {
  return {
    classTree,
    declaredPropertyCount: (_irdi: string) => 0,
  };
}

describe("buildFlatTree", () => {
  it("returns an empty array for an empty tree", () => {
    expect(buildFlatTree(makeBundle([]) as DictionaryBundle)).toEqual([]);
  });

  it("flattens a single-node tree", () => {
    const tree = [
      { irdi: "0112/1", code: "AAA001", name: "Root", classType: undefined, superclass: undefined, children: [] },
    ];
    const flat = buildFlatTree(makeBundle(tree) as DictionaryBundle);
    expect(flat).toHaveLength(1);
    expect(flat[0]).toMatchObject({
      irdi: "0112/1",
      code: "AAA001",
      label: "Root",
      depth: 0,
      parentIrdi: null,
    });
  });

  it("walks children in DFS order with increasing depth", () => {
    const tree = [
      {
        irdi: "0112/1",
        code: "AAA001",
        name: "Root",
        classType: undefined,
        superclass: undefined,
        children: [
          { irdi: "0112/2", code: "AAA002", name: "Child A", classType: undefined, superclass: undefined, children: [] },
          {
            irdi: "0112/3", code: "AAA003", name: "Child B", classType: undefined, superclass: undefined,
            children: [
              { irdi: "0112/4", code: "AAA004", name: "Grandchild", classType: undefined, superclass: undefined, children: [] },
            ],
          },
        ],
      },
    ];
    const flat = buildFlatTree(makeBundle(tree) as DictionaryBundle);
    expect(flat.map((n) => [n.code, n.depth, n.parentIrdi])).toEqual([
      ["AAA001", 0, null],
      ["AAA002", 1, "0112/1"],
      ["AAA003", 1, "0112/1"],
      ["AAA004", 2, "0112/3"],
    ]);
  });

  it("falls back to codeFromIrdi when name is missing", () => {
    const tree = [
      { irdi: "0112/2///61360_4#AAA999", code: undefined, name: undefined, classType: undefined, superclass: undefined, children: [] },
    ];
    const flat = buildFlatTree(makeBundle(tree) as DictionaryBundle);
    expect(flat[0].code).toBe("AAA999");
    expect(flat[0].label).toBe("AAA999");
  });
});
