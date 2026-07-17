/**
 * Per-entity diff port of `Opencdd::EntityDiff` (Ruby).
 *
 * Computes added / removed / changed fields between two entity
 * payloads (the wire-format JSON shape, not the Ruby model).
 * Multilingual fields (<base>.<lang>) are grouped under <base>.
 *
 * Used by VersionDiff.vue to render a visual diff between two
 * historical versions of the same entity.
 */

export interface EntityLike {
  irdi?: string;
  code?: string;
  raw_properties?: Record<string, unknown>;
  version_meta?: {
    version?: string | null;
    timestamp?: string | null;
  };
  [key: string]: unknown;
}

export interface DiffChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface EntityDiffResult {
  irdi: string | undefined;
  added: string[];
  removed: string[];
  changed: DiffChange[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function groupProperties(properties: Record<string, unknown>): Map<string, unknown> {
  const groups = new Map<string, Map<string, string> | string>();
  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined) continue;
    const m = key.match(/^(.+)\.([a-z]{2,3}(?:-[a-z0-9]+)?)$/i);
    if (m) {
      const base = m[1]!;
      const lang = m[2]!.toLowerCase();
      const langMap = (groups.get(base) as Map<string, string> | undefined) ?? new Map<string, string>();
      if (langMap instanceof Map) {
        langMap.set(lang, String(value));
        groups.set(base, langMap);
      }
    } else {
      groups.set(key, String(value));
    }
  }
  // Convert Maps to plain objects for stable comparison.
  const out = new Map<string, unknown>();
  for (const [k, v] of groups) {
    if (v instanceof Map) {
      const obj: Record<string, string> = {};
      for (const [lang, val] of v) obj[lang] = val;
      out.set(k, obj);
    } else {
      out.set(k, v);
    }
  }
  return out;
}

export function entityDiff(
  fromEntity: EntityLike,
  toEntity: EntityLike,
): EntityDiffResult {
  const fromProps = fromEntity.raw_properties ?? {};
  const toProps = toEntity.raw_properties ?? {};
  const fromGroups = groupProperties(fromProps as Record<string, unknown>);
  const toGroups = groupProperties(toProps as Record<string, unknown>);

  const allFields = new Set<string>([...fromGroups.keys(), ...toGroups.keys()]);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: DiffChange[] = [];

  for (const field of Array.from(allFields).sort()) {
    const fromVal = fromGroups.get(field);
    const toVal = toGroups.get(field);
    if (fromVal === undefined && toVal !== undefined) {
      added.push(field);
    } else if (fromVal !== undefined && toVal === undefined) {
      removed.push(field);
    } else if (fromVal !== toVal) {
      const equal = isObject(fromVal) && isObject(toVal)
        ? JSON.stringify(fromVal) === JSON.stringify(toVal)
        : fromVal === toVal;
      if (!equal) {
        changed.push({ field, from: fromVal, to: toVal });
      }
    }
  }

  return {
    irdi: fromEntity.irdi ?? toEntity.irdi,
    added,
    removed,
    changed,
  };
}

export function diffSummary(diff: EntityDiffResult): string {
  const parts: string[] = [];
  if (diff.added.length) parts.push(`+${diff.added.length}`);
  if (diff.removed.length) parts.push(`-${diff.removed.length}`);
  if (diff.changed.length) parts.push(`~${diff.changed.length}`);
  return parts.length ? parts.join(" ") : "no changes";
}

export function diffIsEmpty(diff: EntityDiffResult): boolean {
  return diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0;
}
