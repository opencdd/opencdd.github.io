#!/usr/bin/env tsx
/**
 * Generates one tree.json per dictionary under public/d/<slug>/.
 *
 * The class-tree island fetches `/d/<slug>/tree.json` at mount instead
 * of receiving the tree as an inline prop. The inline-prop approach
 * duplicated the entire tree payload on every entity detail page
 * (~540KB per page for the largest dictionary, ~6GB total).
 *
 * Runs as part of `npm run build` before `astro build`.
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistry, loadDictionary } from "../src/lib/data.ts";
import { buildFlatTree } from "../src/lib/tree.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const publicRoot = resolve(repoRoot, "public/d");

function log(message) {
  process.stdout.write(`[gen-tree] ${message}\n`);
}

const registry = loadRegistry();
let totalNodes = 0;
for (const entry of registry.dictionaries) {
  const bundle = loadDictionary(entry.slug);
  const flat = buildFlatTree(bundle);
  const outDir = resolve(publicRoot, entry.slug);
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "tree.json");
  writeFileSync(outPath, JSON.stringify(flat));
  totalNodes += flat.length;
  log(`${entry.slug}: ${flat.length} nodes → ${outPath}`);
}
log(`done. ${totalNodes} total nodes across ${registry.dictionaries.length} dictionaries.`);
