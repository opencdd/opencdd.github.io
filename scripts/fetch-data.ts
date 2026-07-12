#!/usr/bin/env tsx
/**
 * Fetch-data script — populates `src/content/data/` with the JSON the
 * Astro browser reads at build time.
 *
 * Two modes:
 *
 * 1. Local dev (default). Copies from `../cdd-data/browser/public/data/`
 *    when it exists. Bridge during Phase A — the data pipeline still
 *    runs in cdd-data until TODO.astro/04 ships the release flow.
 *
 * 2. Release fetch (when CDD_DATA_RELEASE=<tag> or `latest`). Downloads
 *    a GitHub Release artifact from opencdd/cdd-data and unzips it.
 */

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const dataTarget = resolve(repoRoot, "src/content/data");

const CDD_DATA_RELEASE = process.env.CDD_DATA_RELEASE;
const CDD_DATA_REPO = process.env.CDD_DATA_REPO ?? "opencdd/cdd-data";

function log(message: string): void {
  process.stdout.write(`[fetch-data] ${message}\n`);
}

function fetchFromLocal(): void {
  // If committed data already exists (src/content/data/index.json),
  // skip the copy — this is the CI path where data is committed.
  if (existsSync(resolve(dataTarget, "index.json"))) {
    log("committed data already present — skipping fetch");
    return;
  }

  const localData = resolve(repoRoot, "../cdd-data/data");
  if (!existsSync(localData)) {
    throw new Error(
      `Local data source not found at ${localData}. ` +
        `Either run \`rake browser:build_all\` in cdd-data, or set ` +
        `CDD_DATA_RELEASE=latest to fetch from GitHub Releases.`,
    );
  }
  log(`copying from ${localData}`);
  if (existsSync(dataTarget)) {
    rmSync(dataTarget, { recursive: true, force: true });
  }
  mkdirSync(dataTarget, { recursive: true });
  cpSync(localData, dataTarget, { recursive: true });
  log(`copied to ${dataTarget}`);
}

function fetchFromRelease(release: string): void {
  log(`fetching release ${release} from ${CDD_DATA_REPO}`);
  const tmpDir = resolve(repoRoot, ".fetch-data-tmp");
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  try {
    const tag =
      release === "latest"
        ? execSync(
            `gh api repos/${CDD_DATA_REPO}/releases/latest --jq .tag_name`,
            { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
          ).trim()
        : release;

    const assetsJson = execSync(
      `gh api repos/${CDD_DATA_REPO}/releases/tags/${tag} --jq '.assets[].browser_download_url'`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
    const assetUrls = assetsJson.split("\n").filter((l) => l.trim().length > 0);
    const zipUrls = assetUrls.filter((u) => u.endsWith(".zip"));
    if (zipUrls.length === 0) {
      throw new Error(`no .zip asset found in release ${tag}`);
    }

    const zipPath = resolve(tmpDir, "data.zip");
    for (const url of zipUrls) {
      log(`downloading ${url}`);
      execSync(`curl -sSL ${url} -o ${zipPath}`, { stdio: "inherit" });
    }

    const unzipDir = resolve(tmpDir, "unzipped");
    mkdirSync(unzipDir, { recursive: true });
    execSync(`unzip -q ${zipPath} -d ${unzipDir}`, { stdio: "inherit" });

    const findResult = execSync(
      `find ${unzipDir} -name index.json -maxdepth 3`,
      { encoding: "utf8" },
    ).trim();
    if (!findResult) {
      throw new Error(`index.json not found in release artifact`);
    }
    const dataRoot = dirname(findResult);

    log(`moving ${dataRoot} -> ${dataTarget}`);
    if (existsSync(dataTarget)) {
      rmSync(dataTarget, { recursive: true, force: true });
    }
    cpSync(dataRoot, dataTarget, { recursive: true });
    log(`done`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function runFixups(): void {
  // Upgrade OceanRunner bare-code references to synthetic IRDIs. See
  // scripts/fix-oceanrunner-irdis.ts for context. Idempotent.
  const oceanrunnerPath = resolve(dataTarget, "oceanrunner/database.json");
  if (existsSync(oceanrunnerPath)) {
    execSync("npx tsx scripts/fix-oceanrunner-irdis.ts", {
      stdio: "inherit",
      cwd: repoRoot,
    });
  }
}

try {
  if (CDD_DATA_RELEASE) {
    try {
      fetchFromRelease(CDD_DATA_RELEASE);
      runFixups();
    } catch (releaseErr) {
      const msg = (releaseErr as Error).message;
      if (msg.includes("404") || msg.includes("Not Found")) {
        process.stderr.write(
          `[fetch-data] Release not found — falling back to committed data.\n`,
        );
        fetchFromLocal();
        runFixups();
      } else {
        throw releaseErr;
      }
    }
  } else {
    fetchFromLocal();
    runFixups();
  }
} catch (err) {
  process.stderr.write(`[fetch-data] FAILED: ${(err as Error).message}\n`);
  process.exit(1);
}
