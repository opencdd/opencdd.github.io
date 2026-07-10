/**
 * Re-export JSON wire types from the shared model package.
 *
 * The model layer (opencdd-ts / @opencdd/models) is the single source
 * of truth for all types — including the JSON wire format produced by
 * the Ruby exporter. The browser previously maintained its own parallel
 * type hierarchy here; that violated DRY and drifted from the model.
 *
 * See @opencdd/models src/models/jsonTypes.ts for the canonical definitions.
 */

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
} from "@opencdd/models";

export {
  isClassNode,
  isPropertyNode,
  isUnitNode,
  isValueListNode,
  isValueTermNode,
  isRelationNode,
  isViewControlNode,
} from "@opencdd/models";
