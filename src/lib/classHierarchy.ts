/**
 * Build-time SVG emitter for class hierarchy diagrams.
 *
 * Renders a vertical tree showing:
 *   - ancestor chain (root → ... → parent → self)
 *   - self (highlighted center node)
 *   - subclasses (children of self)
 *   - powertype instances (where self is the powertype)
 *
 * Pure SVG generation — no client JS, no mermaid runtime. Output
 * is inlined into the class detail page at build time.
 */

import type { DictionaryBundle } from "./bundle";
import type { ClassNode } from "./types";
import { codeFromIrdi } from "./irdi";

export interface HierarchyNode {
  irdi: string;
  code: string;
  name: string;
  href: string;
  isSelf: boolean;
}

export interface HierarchyLayout {
  width: number;
  height: number;
  edges: Array<{ from: HierarchyNode; to: HierarchyNode; kind: "ancestor" | "subclass" | "instance" }>;
  nodes: HierarchyNode[];
}

const NODE_W = 160;
const NODE_H = 44;
const ROW_GAP = 28;
const COL_GAP = 16;
const PADDING = 24;

function toNode(irdi: string, bundle: DictionaryBundle, dictSlug: string, isSelf = false): HierarchyNode {
  const entity = bundle.find(irdi) as ClassNode | undefined;
  const code = entity?.code ?? codeFromIrdi(irdi);
  return {
    irdi,
    code,
    name: entity?.preferred_name ?? code,
    href: `/d/${dictSlug}/c/${code}/`,
    isSelf,
  };
}

export function computeClassHierarchy(
  irdi: string,
  bundle: DictionaryBundle,
  dictSlug: string,
  options: { maxSubclasses?: number; maxInstances?: number } = {},
): HierarchyLayout | null {
  const maxSubclasses = options.maxSubclasses ?? 12;
  const maxInstances = options.maxInstances ?? 12;

  const self = bundle.find(irdi) as ClassNode | undefined;
  if (!self || self.type !== "class") return null;

  const ancestors = (bundle.ancestorChainOf(irdi) ?? [])
    .filter((a) => a.type === "class")
    .slice(-4) as ClassNode[]; // last 4 ancestors — keep diagram readable

  const subclasses = bundle.subclassesOf(irdi).slice(0, maxSubclasses);
  const instances = bundle.instancesOf(irdi).slice(0, maxInstances);

  // Layout: vertical rows. Row 0 = root ancestor, Row N-1 = instances.
  // Each row's nodes are centered horizontally.
  const rows: HierarchyNode[][] = [];
  for (const a of ancestors) {
    rows.push([toNode(a.irdi, bundle, dictSlug, false)]);
  }
  rows.push([toNode(irdi, bundle, dictSlug, true)]);
  if (subclasses.length > 0) {
    rows.push(subclasses.map((s) => toNode(s.irdi, bundle, dictSlug, false)));
  }
  if (instances.length > 0) {
    rows.push(instances.map((i) => toNode(i.irdi, bundle, dictSlug, false)));
  }

  // Compute column positions per row (centered).
  const rowWidths = rows.map((row) => row.length * NODE_W + (row.length - 1) * COL_GAP);
  const maxRowWidth = Math.max(...rowWidths, NODE_W);
  const width = maxRowWidth + PADDING * 2;
  const height = rows.length * NODE_H + (rows.length - 1) * ROW_GAP + PADDING * 2;

  // Assign x/y coordinates.
  rows.forEach((row, rowIdx) => {
    const rowWidth = rowWidths[rowIdx] ?? NODE_W;
    const startX = PADDING + (maxRowWidth - rowWidth) / 2;
    const y = PADDING + rowIdx * (NODE_H + ROW_GAP);
    row.forEach((node, colIdx) => {
      (node as HierarchyNode & { x: number; y: number }).x = startX + colIdx * (NODE_W + COL_GAP);
      (node as HierarchyNode & { y: number }).y = y;
    });
  });

  const flatNodes: HierarchyNode[] = rows.flat();

  // Build edges.
  const edges: HierarchyLayout["edges"] = [];
  // ancestor chain → self
  for (let i = 0; i < ancestors.length; i++) {
    const from = ancestors[i]!;
    const to = i === ancestors.length - 1 ? self : ancestors[i + 1]!;
    edges.push({
      from: toNode(from.irdi, bundle, dictSlug, false),
      to: toNode(to.irdi, bundle, dictSlug, false),
      kind: "ancestor",
    });
  }
  // self → subclasses
  for (const s of subclasses) {
    edges.push({
      from: toNode(irdi, bundle, dictSlug, true),
      to: toNode(s.irdi, bundle, dictSlug, false),
      kind: "subclass",
    });
  }
  // subclasses → instances (powertype relationship)
  if (instances.length > 0) {
    for (const inst of instances) {
      edges.push({
        from: toNode(irdi, bundle, dictSlug, true),
        to: toNode(inst.irdi, bundle, dictSlug, false),
        kind: "instance",
      });
    }
  }

  return { width, height, edges, nodes: flatNodes };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(s: string, maxLen = 22): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "…";
}

export function renderHierarchySvg(layout: HierarchyLayout): string {
  const positioned = layout.nodes as Array<HierarchyNode & { x?: number; y?: number }>;
  const nodeById = new Map(positioned.map((n) => [n.irdi, n]));

  const edgePaths = layout.edges
    .map((edge) => {
      const from = nodeById.get(edge.from.irdi);
      const to = nodeById.get(edge.to.irdi);
      if (!from || !to || from.x === undefined || from.y === undefined || to.x === undefined || to.y === undefined) {
        return "";
      }
      const x1 = from.x + NODE_W / 2;
      const y1 = from.y + NODE_H;
      const x2 = to.x + NODE_W / 2;
      const y2 = to.y;
      const midY = (y1 + y2) / 2;
      const stroke =
        edge.kind === "ancestor" ? "var(--color-ink-300)" :
        edge.kind === "subclass" ? "var(--color-teal-400)" :
        "var(--color-hex-300)";
      const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
      return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.7"/>`;
    })
    .join("\n  ");

  const nodeRects = positioned
    .map((n) => {
      if (n.x === undefined || n.y === undefined) return "";
      const fill = n.isSelf ? "var(--color-hex-100)" : "var(--color-paper-50)";
      const stroke = n.isSelf ? "var(--color-hex-400)" : "var(--color-paper-400)";
      const textColor = n.isSelf ? "var(--color-hex-800)" : "var(--color-ink-700)";
      const codeColor = n.isSelf ? "var(--color-hex-700)" : "var(--color-ink-500)";
      const codeText = escapeXml(truncate(n.code, 12));
      const nameText = escapeXml(truncate(n.name));
      return `
  <a href="${escapeXml(n.href)}" class="hierarchy-node">
    <rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="6" ry="6"
          fill="${fill}" stroke="${stroke}" stroke-width="${n.isSelf ? 2 : 1}"/>
    <text x="${n.x + NODE_W / 2}" y="${n.y + 16}" text-anchor="middle"
          font-family="var(--font-mono)" font-size="10" fill="${codeColor}">${codeText}</text>
    <text x="${n.x + NODE_W / 2}" y="${n.y + 32}" text-anchor="middle"
          font-family="var(--font-sans)" font-size="11" fill="${textColor}">${nameText}</text>
  </a>`;
    })
    .join("\n");

  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}"
       xmlns="http://www.w3.org/2000/svg" class="hierarchy-diagram" role="img"
       aria-label="Class hierarchy diagram">
  <style>
    .hierarchy-node { cursor: pointer; }
    .hierarchy-node text { pointer-events: none; }
  </style>
  ${edgePaths}
  ${nodeRects}
</svg>`;
}
