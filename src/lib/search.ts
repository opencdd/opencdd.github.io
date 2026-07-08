/**
 * Pure search helpers for the browser's global cross-type search.
 *
 * Matching is intentionally simple: case-insensitive substring on
 * `code`, `irdi`, and `preferred_name`. Pagefind handles cross-page
 * search; this module powers the in-page class tree filter.
 */

import type { EntityNode } from "./types";

export function normalizeSearchQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

export function entityMatches(node: EntityNode, query: string): boolean {
  if (query.length === 0) return false;
  const code = node.code;
  if (code !== undefined && code.toLowerCase().includes(query)) return true;
  if (node.irdi.toLowerCase().includes(query)) return true;
  const name = node.preferred_name;
  if (name !== undefined && name.toLowerCase().includes(query)) return true;
  return false;
}
