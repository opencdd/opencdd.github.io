/**
 * Class tree module — owns all tree-building and tree-flattening logic.
 *
 * `buildClassTree` constructs a nested forest from a flat class list.
 * `buildFlatTree` flattens it into the DFS-ordered array the Vue
 * ClassTree island consumes.
 *
 * The ClassTreeNode interface lives here so that tree.ts is the
 * single source of truth for tree-shaped data. DictionaryBundle
 * imports it for its constructor param.
 */

import type { DictionaryBundle } from "./bundle";
import type { ClassNode } from "./types";
import { codeFromIrdi } from "./irdi";

export interface ClassTreeNode {
  readonly irdi: string;
  readonly code: string | undefined;
  readonly name: string | undefined;
  readonly classType: string | undefined;
  readonly superclass: string | undefined;
  readonly children: ClassTreeNode[];
}

export interface FlatTreeNode {
  readonly irdi: string;
  readonly code: string;
  readonly label: string;
  readonly parentIrdi: string | null;
  readonly depth: number;
  readonly declaredPropertyCount: number;
}

export function buildClassTree(
  classes: readonly ClassNode[],
): ClassTreeNode[] {
  const lookup = new Map<string, ClassTreeNode>();
  for (const node of classes) {
    if (!node.irdi) continue;
    lookup.set(node.irdi, {
      irdi: node.irdi,
      code: node.code,
      name: node.preferred_name,
      classType: node.class_type,
      superclass: node.superclass,
      children: [],
    });
  }
  const roots: ClassTreeNode[] = [];
  for (const node of lookup.values()) {
    if (node.superclass && lookup.has(node.superclass)) {
      lookup.get(node.superclass)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  sortTree(roots);
  return roots;
}

function sortTree(nodes: ClassTreeNode[]): void {
  nodes.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""));
  for (const n of nodes) sortTree(n.children);
}

export function buildFlatTree(bundle: DictionaryBundle): FlatTreeNode[] {
  const out: FlatTreeNode[] = [];
  walk(bundle.classTree, 0, null, bundle, out);
  return out;
}

function walk(
  nodes: readonly ClassTreeNode[],
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
