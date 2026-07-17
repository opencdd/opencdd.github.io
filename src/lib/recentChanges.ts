/**
 * Build per-dictionary recent-changes feed.
 *
 * Walks every entity in a bundle, collects its version_history
 * entries, and returns them sorted reverse-chronologically.
 *
 * Pure build-time helper — no client-side runtime.
 */

import type { DictionaryBundle } from "./bundle";
import type { VersionHistoryEntry, EntityType } from "./types";

export interface ChangeRow {
  irdi: string;
  code: string;
  name: string;
  type: EntityType;
  version: string | null | undefined;
  revision: string | null | undefined;
  status: string | null | undefined;
  timestamp: string | null | undefined;
  user: string | null | undefined;
  changeRequestId: string | null | undefined;
  isCurrent: boolean | null | undefined;
  href: string;
}

const ENTITY_TYPE_ORDER: EntityType[] = [
  "class",
  "property",
  "value_list",
  "value_term",
  "unit",
  "relation",
  "view_control",
];

const ROUTE_SEGMENT: Record<EntityType, string> = {
  class: "c",
  property: "p",
  value_list: "v",
  value_term: "t",
  unit: "u",
  relation: "r",
  view_control: "vc",
};

export function recentChanges(
  bundle: DictionaryBundle,
  dictSlug: string,
  limit = 500,
): ChangeRow[] {
  const rows: ChangeRow[] = [];
  for (const type of ENTITY_TYPE_ORDER) {
    const segment = ROUTE_SEGMENT[type];
    for (const entity of bundle.entitiesOfType(type)) {
      const entries = entity.version_history ?? [];
      if (entries.length === 0) continue;
      const code = entity.code ?? "";
      const name = entity.preferred_name ?? code;
      for (const entry of entries) {
        rows.push({
          irdi: entity.irdi,
          code,
          name,
          type,
          version: entry.version,
          revision: entry.revision,
          status: entry.status,
          timestamp: entry.timestamp,
          user: entry.user,
          changeRequestId: entry.change_request_id,
          isCurrent: entry.is_current,
          href: `/d/${dictSlug}/${segment}/${code}/`,
        });
      }
    }
  }
  rows.sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  return rows.slice(0, limit);
}

export interface ChangeMonthGroup {
  monthKey: string;       // e.g. "2023-08"
  monthLabel: string;     // e.g. "August 2023"
  rows: ChangeRow[];
}

export function groupByMonth(rows: readonly ChangeRow[]): ChangeMonthGroup[] {
  const groups = new Map<string, ChangeRow[]>();
  for (const row of rows) {
    if (!row.timestamp) continue;
    const m = row.timestamp.match(/^(\d{4})-(\d{2})/);
    if (!m) continue;
    const monthKey = `${m[1]}-${m[2]}`;
    const arr = groups.get(monthKey) ?? [];
    arr.push(row);
    groups.set(monthKey, arr);
  }
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, groupRows]) => {
      const [year, month] = key.split("-");
      const monthIdx = parseInt(month ?? "0", 10) - 1;
      const monthLabel = `${MONTH_NAMES[monthIdx] ?? month} ${year}`;
      return { monthKey: key, monthLabel, rows: groupRows };
    });
}
