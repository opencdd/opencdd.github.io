/**
 * JSON wire types — re-exported from @opencdd/models (opencdd-ts).
 *
 * The model package is the single source of truth for all types.
 * Uses `import type` so the dependency is compile-time only —
 * no runtime import from @opencdd/models (which has ESM extension
 * issues under tsx/Node). Type guards are trivial functions defined
 * locally to avoid the runtime import.
 */

import type {
  EntityType,
  Synonym,
  EntityDates,
  MultilingualText,
  VersionHistoryEntry,
  EntityMetadata,
  BaseNode,
  ClassNode,
  PropertyNode,
  UnitNode,
  ValueListNode,
  ValueTermNode,
  RelationNode,
  ViewControlNode,
  EntityNode,
} from "@opencdd/models";

export type {
  EntityType,
  Synonym,
  EntityDates,
  MultilingualText,
  VersionHistoryEntry,
  EntityMetadata,
  BaseNode,
  ClassNode,
  PropertyNode,
  UnitNode,
  ValueListNode,
  ValueTermNode,
  RelationNode,
  ViewControlNode,
  EntityNode,
};

export function isClassNode(node: EntityNode): node is ClassNode {
  return node.type === "class";
}

export function isPropertyNode(node: EntityNode): node is PropertyNode {
  return node.type === "property";
}

export function isUnitNode(node: EntityNode): node is UnitNode {
  return node.type === "unit";
}

export function isValueListNode(node: EntityNode): node is ValueListNode {
  return node.type === "value_list";
}

export function isValueTermNode(node: EntityNode): node is ValueTermNode {
  return node.type === "value_term";
}

export function isRelationNode(node: EntityNode): node is RelationNode {
  return node.type === "relation";
}

export function isViewControlNode(node: EntityNode): node is ViewControlNode {
  return node.type === "view_control";
}
