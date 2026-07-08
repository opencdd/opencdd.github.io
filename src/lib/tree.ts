/**
 * Generates the tree JSON shipped to the client-side class-tree island.
 *
 * For each dictionary, emits `public/d/<slug>/tree.json` containing
 * a flat array of nodes (DFS order, including depth + parentIrdi) and
 * the per-node declared-property count. The island reads this at
 * hydration — small enough to ship even for the largest dictionary
 * (iec61987, ~2700 classes).
 */

import type { DictionaryBundle } from "./bundle";
import { codeFromIrdi } from "./irdi";

export interface FlatTreeNode {
  readonly irdi: string;
  readonly code: string;
  readonly label: string;
  readonly parentIrdi: string | null;
  readonly depth: number;
  readonly declaredPropertyCount: number;
}

export function buildFlatTree(bundle: DictionaryBundle): FlatTreeNode[] {
  const out: FlatTreeNode[] = [];
  walk(bundle.classTree, 0, null, bundle, out);
  return out;
}

function walk(
  nodes: readonly DictionaryBundle["classTree"][number][],
  depth: number,
  parentIrdi: string | null,
  bundle: DictionaryBundle,
  out: FlatTreeNode[],
): void {
  for (const node of nodes) {
    out.push({
      irdi: node.irdi,
      code: node.code ?? codeFromIrdi(node.irdi),
      label: node.name ?? node.code ?? codeFromIrdi(node.irdi),
      parentIrdi,
      depth,
      declaredPropertyCount: bundle.declaredPropertyCount(node.irdi),
    });
    walk(node.children, depth + 1, node.irdi, bundle, out);
  }
}
