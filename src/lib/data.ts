/**
 * Build-time data loader. Reads JSON from `src/content/data/` (populated
 * by `npm run fetch-data`) and constructs DictionaryBundle instances
 * with derived indexes.
 *
 * Loaded once per build; cached module-level.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { EntityNode, EntityType } from "./types";
import type { DictionaryRegistry, DictionaryRegistryEntry } from "./registry";
import { DictionaryBundle, buildClassTree } from "./bundle";

// Configurable data root — the seam for tests. In production, defaults
// to src/content/data/ relative to cwd. Tests call configureDataRoot()
// to redirect to a temp dir without mocking node:path.
let dataRootValue: string | null = null;

function dataRoot(): string {
  if (dataRootValue) return dataRootValue;
  return resolve(process.cwd(), "src/content/data");
}

/** Override the data root (for tests). Pass null to reset. */
export function configureDataRoot(path: string | null): void {
  dataRootValue = path;
  registryCache = null;
  bundleCache.clear();
}

let registryCache: DictionaryRegistry | null = null;
const bundleCache = new Map<string, DictionaryBundle>();

export function getDataRoot(): string {
  return dataRoot();
}

export function dataExists(): boolean {
  return existsSync(resolve(dataRoot(), "index.json"));
}

export function loadRegistry(): DictionaryRegistry {
  if (registryCache) return registryCache;
  const path = resolve(dataRoot(), "index.json");
  if (!existsSync(path)) {
    throw new Error(
      `data/index.json not found. Run \`npm run fetch-data\` to populate src/content/data/.`,
    );
  }
  const raw = readFileSync(path, "utf8");
  registryCache = JSON.parse(raw) as DictionaryRegistry;
  return registryCache;
}

export function loadDictionary(slug: string): DictionaryBundle {
  const cached = bundleCache.get(slug);
  if (cached) return cached;

  const registry = loadRegistry();
  const entry = registry.dictionaries.find((d) => d.slug === slug);
  if (!entry) throw new Error(`unknown dictionary slug: ${slug}`);

  const path = resolve(dataRoot(), slug, "database.json");
  if (!existsSync(path)) {
    throw new Error(`data/${slug}/database.json not found`);
  }
  const raw = readFileSync(path, "utf8");
  const nodes = JSON.parse(raw) as EntityNode[];

  const entities = new Map<string, EntityNode>();
  const byCode = new Map<string, EntityNode>();
  const byType = new Map<EntityType, EntityNode[]>();
  for (const node of nodes) {
    if (node.irdi) entities.set(node.irdi, node);
    if (node.code) byCode.set(node.code, node);
    const list = byType.get(node.type) ?? [];
    list.push(node);
    byType.set(node.type, list);
  }

  const bundle = new DictionaryBundle(
    slug,
    entry,
    entities,
    byCode,
    byType,
    buildClassTree(byType.get("class") ?? []),
  );
  bundleCache.set(slug, bundle);
  return bundle;
}

export function listDictionarySlugs(): string[] {
  const registry = loadRegistry();
  return registry.dictionaries.map((d) => d.slug);
}

export function listRegistryEntries(): DictionaryRegistryEntry[] {
  return loadRegistry().dictionaries;
}

/**
 * Enumerate (slug, node) pairs for every entity of the given type
 * across every dictionary. Drives `getStaticPaths` for entity detail
 * pages.
 */
export function* enumerateEntitiesByType(
  type: EntityType,
): Generator<{ slug: string; node: EntityNode }> {
  for (const slug of listDictionarySlugs()) {
    const bundle = loadDictionary(slug);
    for (const node of bundle.byType.get(type) ?? []) {
      if (node.type !== type) continue;
      yield { slug, node };
    }
  }
}

/**
 * Enumerate (slug, code) for every entity of every detailable type.
 * Drives the sitemap and 404-detection.
 */
export function listAllEntityCodes(): Array<{
  slug: string;
  code: string;
  type: EntityType;
}> {
  const out: Array<{ slug: string; code: string; type: EntityType }> = [];
  for (const slug of listDictionarySlugs()) {
    const bundle = loadDictionary(slug);
    for (const [type, nodes] of bundle.byType.entries()) {
      for (const node of nodes) {
        if (!node.code) continue;
        out.push({ slug, code: node.code, type });
      }
    }
  }
  return out;
}

/** Diagnostic — used by the fetch-data script to confirm the data dir exists. */
export function listDataDirs(): string[] {
  if (!existsSync(dataRoot())) return [];
  return readdirSync(dataRoot(), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}
