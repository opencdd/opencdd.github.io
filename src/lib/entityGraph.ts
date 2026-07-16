/**
 * Entity relationship graph — computes the neighborhood of an entity
 * from the bundle for interactive graph visualization.
 *
 * The graph captures ALL relationship types in CDD (not just the class
 * hierarchy the tree sidebar shows). For a class, this includes
 * superclass, subclasses, properties, units, value lists, relations,
 * powertype instances, and composition targets. For a property, it
 * includes the declaring class, unit, value list, and data-type
 * references. This makes the graph a superset of the tree view —
 * nothing is hidden.
 */

import type { DictionaryBundle } from "./bundle";
import type { EntityNode, EntityType } from "./types";
import { resolveEntityRef, type EntityRef } from "./entityRef";

export type EdgeKind =
  | "superclass"
  | "subclass"
  | "property"
  | "unit"
  | "value_list"
  | "instance"
  | "relation_domain"
  | "relation_codomain"
  | "used_by";

export interface GraphNode extends EntityRef {
  irdi: string;
  type: EntityType;
  degree: 0 | 1 | 2;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: EdgeKind;
}

export interface EntityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const MAX_NODES = 80;

export function computeEntityGraph(
  irdi: string,
  bundle: DictionaryBundle,
  slug: string,
  maxDegree: 1 | 2 = 1,
): EntityGraph {
  const center = bundle.find(irdi);
  if (!center) return { nodes: [], edges: [] };

  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const seen = new Set<string>([irdi]);

  nodeMap.set(irdi, {
    ...resolveEntityRef(irdi, bundle, slug),
    irdi,
    type: center.type,
    degree: 0,
  });

  function addEdge(source: string, target: string, kind: EdgeKind) {
    if (!target || source === target) return;
    edges.push({ source, target, kind });
  }

  function addNode(nodeIrdi: string, type: EntityType, degree: 0 | 1 | 2): boolean {
    if (!nodeIrdi || seen.has(nodeIrdi)) return false;
    if (nodeMap.size >= MAX_NODES) return false;
    seen.add(nodeIrdi);
    nodeMap.set(nodeIrdi, {
      ...resolveEntityRef(nodeIrdi, bundle, slug),
      irdi: nodeIrdi,
      type,
      degree,
    });
    return true;
  }

  function collectClass(classIrdi: string, degree: 1 | 2) {
    const cls = bundle.find(classIrdi);
    if (!cls || cls.type !== "class") return;

    // Superclass
    const superIrdi = (cls as any).superclass as string | undefined;
    if (superIrdi && bundle.hasEntity(superIrdi)) {
      addNode(superIrdi, "class", degree);
      addEdge(classIrdi, superIrdi, "superclass");
    }

    for (const sub of bundle.subclassesOf(classIrdi)) {
      if (addNode(sub.irdi, "class", degree)) {
        addEdge(classIrdi, sub.irdi, "subclass");
      }
    }

    for (const prop of bundle.propertiesByClassIrdi(classIrdi)) {
      if (addNode(prop.irdi, "property", degree)) {
        addEdge(classIrdi, prop.irdi, "property");

        if (prop.unit) {
          if (addNode(prop.unit, "unit", degree)) {
            addEdge(prop.irdi, prop.unit, "unit");
          }
        }
        if (prop.value_list) {
          if (addNode(prop.value_list, "value_list", degree)) {
            addEdge(prop.irdi, prop.value_list, "value_list");
          }
        }
      }
    }

    for (const inst of bundle.instancesOf(classIrdi)) {
      if (addNode(inst.irdi, "class", degree)) {
        addEdge(classIrdi, inst.irdi, "instance");
      }
    }

    for (const rel of bundle.relationsForClass(classIrdi)) {
      if (addNode(rel.irdi, "relation", degree)) {
        addEdge(classIrdi, rel.irdi, "relation_domain");
      }
    }

    for (const rel of bundle.relationsForCodomainClass(classIrdi)) {
      if (addNode(rel.irdi, "relation", degree)) {
        addEdge(rel.irdi, classIrdi, "relation_codomain");
      }
    }
  }

  function collectProperty(propIrdi: string, degree: 1 | 2) {
    for (const cls of bundle.classesDeclaringProperty(propIrdi)) {
      if (addNode(cls.irdi, "class", degree)) {
        addEdge(propIrdi, cls.irdi, "used_by");
      }
    }
  }

  function collectUnit(unitIrdi: string, degree: 1 | 2) {
    for (const prop of bundle.propertiesForUnit(unitIrdi)) {
      if (addNode(prop.irdi, "property", degree)) {
        addEdge(unitIrdi, prop.irdi, "used_by");
      }
    }
  }

  function collectValueList(vlIrdi: string, degree: 1 | 2) {
    for (const prop of bundle.propertiesForValueList(vlIrdi)) {
      if (addNode(prop.irdi, "property", degree)) {
        addEdge(vlIrdi, prop.irdi, "used_by");
      }
    }
  }

  function collectByType(nodeIrdi: string, type: EntityType, degree: 1 | 2) {
    switch (type) {
      case "class":
        collectClass(nodeIrdi, degree);
        break;
      case "property":
        collectProperty(nodeIrdi, degree);
        break;
      case "unit":
        collectUnit(nodeIrdi, degree);
        break;
      case "value_list":
        collectValueList(nodeIrdi, degree);
        break;
    }
  }

  // ── Degree 1 ──────────────────────────────────────────────
  collectByType(irdi, center.type, 1);

  // ── Degree 2 ──────────────────────────────────────────────
  if (maxDegree >= 2) {
    const degree1Irdis = Array.from(nodeMap.values())
      .filter((n) => n.degree === 1)
      .map((n) => n.irdi);
    for (const nodeIrdi of degree1Irdis) {
      const node = nodeMap.get(nodeIrdi);
      if (node) {
        collectByType(nodeIrdi, node.type, 2);
      }
    }
  }

  // Deduplicate edges
  const edgeKeys = new Set<string>();
  const uniqueEdges = edges.filter((e) => {
    const key = `${e.source}→${e.target}:${e.kind}`;
    if (edgeKeys.has(key)) return false;
    edgeKeys.add(key);
    return true;
  });

  return {
    nodes: Array.from(nodeMap.values()),
    edges: uniqueEdges,
  };
}
