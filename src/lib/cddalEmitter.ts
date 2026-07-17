/**
 * Per-entity CDDAL fragment emitter.
 *
 * Emits a single `instance NAME < META_CLASS { ... }` block for any
 * entity, suitable for download from the browser. Mirrors the shape
 * of the Ruby `Opencdd::Cddal::Serializer#emit_instance` — uses
 * `raw_properties` as the source of truth so the full .xls content
 * is preserved.
 *
 * Why client-side: the Ruby serializer emits a whole database; users
 * downloading a single entity from the browser want just that entity.
 * A build-time per-entity emit was considered but doubles the data
 * directory size for content that's already on the page.
 */

import type { EntityNode, EntityType } from "./types";

const META_CLASS_IRDI: Record<EntityType, string> = {
  class: "0112/2///61360_4#MDC_C002",
  property: "0112/2///61360_4#MDC_C003",
  unit: "0112/2///61360_4#MDC_C009",
  value_list: "0112/2///61360_4#MDC_C005",
  value_term: "0112/2///61360_4#MDC_C010",
  relation: "0112/2///61360_4#MDC_C011",
  view_control: "0112/2///61360_4#EXT_C001",
};

const HEADER = "# OpenCDD CDDAL fragment — single entity\n";
const SEPARATOR = "# ".repeat(38) + "\n";

function escapeString(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\b/g, "\\b")
    .replace(/\f/g, "\\f");
}

const UNQUOTED_VALUE_RE =
  /^(true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\d{4}-\d{2}-\d{2}|[0-9]+\/[0-9]+\/\/\/[A-Za-z0-9_]+(?:_[0-9]+)?#[A-Za-z0-9_]+|[A-Za-z_][A-Za-z0-9_]*#[A-Za-z0-9_]+(?:##[A-Za-z0-9_]+)?|[A-Za-z_][A-Za-z0-9_]*)$/;

function formatValue(rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined) return '""';
  const s = String(rawValue);
  if (s === "") return '""';

  if (s.startsWith("(") && s.endsWith(")")) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return "{}";
    const parts = splitTopLevel(inner, ",");
    return "{ " + parts.map((p) => formatScalar(p.trim())).join(", ") + " }";
  }
  if (s.startsWith("{") && s.endsWith("}")) {
    return s;
  }
  return formatScalar(s);
}

function formatScalar(s: string): string {
  if (UNQUOTED_VALUE_RE.test(s)) return s;
  return `"${escapeString(s)}"`;
}

function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of s) {
    if (ch === "(" || ch === "{") depth++;
    else if (ch === ")" || ch === "}") depth--;
    if (ch === sep && depth === 0) {
      out.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.length) out.push(buf);
  return out;
}

function symbolName(entity: EntityNode): string {
  if (entity.code && entity.code.length) return entity.code;
  if (entity.preferred_name) {
    const safe = entity.preferred_name
      .replace(/[^A-Za-z0-9_]/g, "_")
      .replace(/^(\d)/, "_$1");
    return safe.length ? safe : "instance";
  }
  return "instance";
}

export interface EmitOptions {
  /** Include a header block with metadata (default: true). */
  header?: boolean;
}

export function emitEntityCddal(
  entity: EntityNode,
  options: EmitOptions = {},
): string {
  const meta = META_CLASS_IRDI[entity.type] ?? "0112/2///61360_4#MDC_C002";
  const name = symbolName(entity);
  const raw = entity.raw_properties ?? {};
  const lines: string[] = [];

  if (options.header !== false) {
    lines.push(HEADER.replace(/\n$/, ""));
    lines.push(`# Entity: ${entity.irdi}`);
    lines.push(`# Type:   ${entity.type}`);
    if (entity.version) lines.push(`# Version: ${entity.version}`);
    if (entity.revision) lines.push(`# Revision: ${entity.revision}`);
    lines.push(SEPARATOR.replace(/\n$/, ""));
  }

  lines.push("");
  lines.push(`instance ${name} < ${meta} {`);

  const keys = Object.keys(raw).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    const value = raw[key];
    if (value === null || value === undefined) continue;
    const s = String(value);
    if (s.length === 0) continue;
    lines.push(`  ${key}: ${formatValue(value)}`);
  }

  lines.push("}");
  return lines.join("\n") + "\n";
}

export function cddalFileName(entity: EntityNode): string {
  return `${entity.code ?? "entity"}.cddal`;
}

export function cddalByteLength(entity: EntityNode): number {
  return new Blob([emitEntityCddal(entity)]).size;
}
