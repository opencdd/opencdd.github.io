/**
 * Build-pipeline stages — concrete `Stage` adapters that the orchestrator
 * (`scripts/fetch-data.ts`) wires together.
 *
 * Each stage is independently importable and testable. Call
 * `stage.run(ctx)` with a `StageContext` pointing at a temp dir; no
 * `execSync`, no shell-out.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  type Stage,
  type StageContext,
  type StageResult,
  committedDataPresent,
  stage,
} from "./pipeline";
import {
  bulkDistributionAllowed,
  dictLicenseRegime,
  filterEntityPayload,
  findEulaViolations,
  isPubliclyServed,
} from "~/lib/licensing";

/**
 * Acquire: skip if `src/content/data/index.json` already exists.
 *
 * This is the CI path: data is committed, no fetch needed. Fires
 * before the local-copy and release-fetch stages so they short-circuit
 * cleanly.
 */
export const skipIfCommitted: Stage = stage("skip-if-committed", (ctx) => {
  if (committedDataPresent(ctx)) {
    return {
      ok: true,
      skipped: true,
      message: "committed data present",
    };
  }
  return { ok: true, message: "no committed data, will fetch" };
});

/**
 * Acquire: copy from a local data-private checkout at `../data-private/data`.
 *
 * Used in local dev when the data pipeline has been run manually.
 */
export function acquireFromLocal(): Stage {
  return stage("acquire-local", (ctx) => {
    const localData = resolve(ctx.repoRoot, "../data-private/data");
    if (!existsSync(localData)) {
      return {
        ok: false,
        error: `local source not found at ${localData}`,
      };
    }
    if (existsSync(ctx.dataTarget)) {
      rmSync(ctx.dataTarget, { recursive: true, force: true });
    }
    mkdirSync(ctx.dataTarget, { recursive: true });
    cpSync(localData, ctx.dataTarget, { recursive: true });
    return { ok: true, message: `copied from ${localData}` };
  });
}

/**
 * Acquire: download a GitHub Release from `opencdd/cdd-data` and unzip
 * into `dataTarget`. Falls back (returns ok:false with 404 hint) if
 * the release does not exist.
 *
 * Release tag comes from `ctx.env.CDD_DATA_RELEASE`; "latest" resolves
 * to the most recent release.
 */
export function acquireFromRelease(repo = "opencdd/cdd-data"): Stage {
  return stage("acquire-release", async (ctx) => {
    const env = ctx.env ?? {};
    const release = env.CDD_DATA_RELEASE;
    if (!release) {
      return { ok: false, error: "CDD_DATA_RELEASE not set" };
    }
    const token = env.CDD_DATA_READ_TOKEN || env.GITHUB_TOKEN || "";

    const tmpDir = resolve(ctx.repoRoot, ".fetch-data-tmp");
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });

    try {
      const tag =
        release === "latest"
          ? execSync(
              `gh api repos/${repo}/releases/latest --jq .tag_name`,
              { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], env: { ...env, GH_TOKEN: token } },
            ).trim()
          : release;

      const assetsJson = execSync(
        `gh api repos/${repo}/releases/tags/${tag} --jq '.assets[].browser_download_url'`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], env: { ...env, GH_TOKEN: token } },
      ).trim();
      const zipUrls = assetsJson
        .split("\n")
        .filter((l) => l.trim().endsWith(".zip"));
      if (zipUrls.length === 0) {
        return { ok: false, error: `no .zip asset in release ${tag}` };
      }

      const zipPath = resolve(tmpDir, "data.zip");
      for (const url of zipUrls) {
        execSync(`curl -sSL ${url} -o ${zipPath}`, {
          stdio: "ignore",
          env,
        });
      }
      const unzipDir = resolve(tmpDir, "unzipped");
      mkdirSync(unzipDir, { recursive: true });
      execSync(`unzip -q ${zipPath} -d ${unzipDir}`, { stdio: "ignore" });

      const findResult = execSync(
        `find ${unzipDir} -name index.json -maxdepth 3`,
        { encoding: "utf8" },
      ).trim();
      if (!findResult) {
        return { ok: false, error: "index.json not found in release artifact" };
      }
      const dataRoot = resolve(findResult).split("/").slice(0, -1).join("/");

      if (existsSync(ctx.dataTarget)) {
        rmSync(ctx.dataTarget, { recursive: true, force: true });
      }
      cpSync(dataRoot, ctx.dataTarget, { recursive: true });
      return { ok: true, message: `fetched release ${tag}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.includes("Not Found")) {
        return { ok: false, error: `release not found (404): ${msg}` };
      }
      return { ok: false, error: msg };
    } finally {
      if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
    }
  });
}

/**
 * Fix: upgrade OceanRunner bare-code references to synthetic IRDIs.
 *
 * The OceanRunner CDDAL fixture emits bare codes (e.g. "AAA001",
 * "UNIVERSE") because it has no top-level dictionary prefix. This
 * stage rewrites the JSON in place so every reference is a valid IRDI.
 * Idempotent — safe to run repeatedly. See
 * `scripts/fix-oceanrunner-irdis.ts` for the implementation.
 */
export function fixOceanRunnerIrbis(): Stage {
  return stage("fix-oceanrunner-irdis", (ctx) => {
    const oceanrunnerPath = resolve(ctx.dataTarget, "oceanrunner/database.json");
    if (!existsSync(oceanrunnerPath)) {
      return { ok: true, skipped: true, message: "no oceanrunner data" };
    }
    execSync("npx tsx scripts/fix-oceanrunner-irdis.ts", {
      stdio: "ignore",
      cwd: ctx.repoRoot,
      env: ctx.env,
    });
    return { ok: true, message: "upgraded IRDIs" };
  });
}

/**
 * Verify: scan all .astro / .mdx files for JSX whitespace bugs (text
 * immediately followed by an inline opening tag on the next line).
 *
 * Exits ok:false if any are found, with the count in the message. The
 * audit script owns the detection logic; this stage wraps it.
 */
export function verifyNoJsxWhitespaceBugs(): Stage {
  return stage("verify-no-jsx-whitespace-bugs", (ctx) => {
    try {
      execSync("npx tsx scripts/audit-jsx-whitespace.ts", {
        stdio: "pipe",
        cwd: ctx.repoRoot,
        env: ctx.env,
      });
      return { ok: true, message: "clean" };
    } catch (err) {
      const stderr =
        (err as { stderr?: Buffer | string })?.stderr?.toString() ??
        (err instanceof Error ? err.message : String(err));
      return { ok: false, error: `JSX whitespace bugs found\n${stderr}` };
    }
  });
}

/**
 * Bulk-artifact locations, relative to a dictionary directory in the
 * data target and to the public tree (`public/d/<slug>/`, where
 * gen-tree and older pipelines placed per-dictionary assets that Astro
 * copies verbatim into dist/).
 */
const BULK_ARTIFACT_DIRS = ["versions", "parcel"] as const;

/**
 * Filter: reduce IEC CDD dictionaries to the EULA §5 FREE ATTRIBUTES.
 *
 * The IEC CDD EULA (§5) allows free distribution of a specific
 * attribute whitelist only; §7/§8 forbid distributing the total
 * database or any other attribute without written IEC permission.
 * This stage rewrites each restricted dictionary's database.json in
 * place (idempotent) and removes bulk artifacts (versions/, parcel/)
 * from both the data tree and the public tree — anything else would
 * constitute a significant-portion distribution.
 *
 * OceanRunner (OpenCDD's own data) and iec62720 (EULA §6: the units
 * dictionary is free in its entirety) pass through untouched. See
 * `lib/licensing.ts` — the policy single source of truth.
 */
export function filterIecFreeAttributes(): Stage {
  return stage("filter-iec-free-attributes", (ctx) => {
    if (!existsSync(ctx.dataTarget)) {
      return { ok: true, skipped: true, message: "no data dir" };
    }
    let filtered = 0;
    let untouched = 0;
    for (const entry of readdirSync(ctx.dataTarget, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (dictLicenseRegime(entry.name) !== "eula-free-attributes") {
        untouched++;
        continue;
      }
      // Non-served dictionaries keep their internal data but nothing of
      // theirs may survive in the public tree.
      if (!isPubliclyServed(entry.name)) {
        const publicDir = resolve(ctx.repoRoot, "public/d", entry.name);
        if (existsSync(publicDir)) {
          rmSync(publicDir, { recursive: true, force: true });
        }
        continue;
      }
      const dictDir = resolve(ctx.dataTarget, entry.name);
      const dbPath = resolve(dictDir, "database.json");
      if (existsSync(dbPath)) {
        const database: unknown = JSON.parse(readFileSync(dbPath, "utf8"));
        const filteredArray = Array.isArray(database)
          ? database.map((e) =>
              typeof e === "object" && e !== null
                ? filterEntityPayload(e as Record<string, unknown>)
                : e,
            )
          : database;
        writeFileSync(dbPath, JSON.stringify(filteredArray));
        filtered++;
      }
      for (const bulk of BULK_ARTIFACT_DIRS) {
        const bulkPath = resolve(dictDir, bulk);
        if (existsSync(bulkPath)) {
          rmSync(bulkPath, { recursive: true, force: true });
        }
      }
    }
    // The public tree (`public/d/`) may hold per-dictionary assets from
    // older builds under different slug spellings (kebab vs flat) —
    // sweep it by its own directory names, not the data tree's.
    const publicRoot = resolve(ctx.repoRoot, "public/d");
    let publicCleaned = 0;
    if (existsSync(publicRoot)) {
      for (const entry of readdirSync(publicRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (dictLicenseRegime(entry.name) !== "eula-free-attributes") continue;
        for (const bulk of BULK_ARTIFACT_DIRS) {
          const bulkPath = resolve(publicRoot, entry.name, bulk);
          if (existsSync(bulkPath)) {
            rmSync(bulkPath, { recursive: true, force: true });
            publicCleaned++;
          }
        }
      }
    }
    return {
      ok: true,
      message: `${filtered} dictionaries reduced to §5 free attributes, ${untouched} unaffected, ${publicCleaned} public bulk dirs removed`,
    };
  });
}

/**
 * Verify: assert no restricted dictionary would serve content beyond
 * the EULA §5 FREE ATTRIBUTES, and no bulk artifacts remain for
 * restricted dictionaries. Runs after the filter stage and also
 * guards the committed-data CI path, where the filter's source data
 * may already be clean — or may not be.
 */
export function verifyEulaCompliance(): Stage {
  return stage("verify-eula-compliance", (ctx) => {
    if (!existsSync(ctx.dataTarget)) {
      return { ok: true, skipped: true, message: "no data dir" };
    }
    const violations: string[] = [];
    for (const entry of readdirSync(ctx.dataTarget, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!bulkDistributionAllowed(entry.name)) {
        const dictDir = resolve(ctx.dataTarget, entry.name);
        const dbPath = resolve(dictDir, "database.json");
        if (existsSync(dbPath)) {
          const found = findEulaViolations(JSON.parse(readFileSync(dbPath, "utf8")));
          violations.push(
            ...found.slice(0, 5).map((v) => `${entry.name}/${v}`),
            ...(found.length > 5
              ? [`… and ${found.length - 5} more in ${entry.name}`]
              : []),
          );
        }
        for (const bulk of BULK_ARTIFACT_DIRS) {
          if (existsSync(resolve(dictDir, bulk))) {
            violations.push(`${entry.name}/${bulk}/ present (bulk distribution)`);
          }
        }
      }
    }
    // Same sweep for the public tree, by its own directory names —
    // older builds used different slug spellings (kebab vs flat).
    const publicRoot = resolve(ctx.repoRoot, "public/d");
    if (existsSync(publicRoot)) {
      for (const entry of readdirSync(publicRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (dictLicenseRegime(entry.name) !== "eula-free-attributes") continue;
        for (const bulk of BULK_ARTIFACT_DIRS) {
          if (existsSync(resolve(publicRoot, entry.name, bulk))) {
            violations.push(
              `public/d/${entry.name}/${bulk}/ present (bulk distribution)`,
            );
          }
        }
      }
    }
    if (violations.length > 0) {
      return {
        ok: false,
        error: `content beyond IEC EULA free attributes would be served:\n${violations.join("\n")}`,
      };
    }
    return { ok: true, message: "within IEC CDD EULA scope" };
  });
}

/**
 * Helper: the standard "acquire → fix → verify" sequence for local dev.
 * Used by `npm run fetch-data` when no release is requested.
 */
export function localAcquireFixVerify(): Stage[] {
  return [
    skipIfCommitted,
    acquireFromLocal(),
    fixOceanRunnerIrbis(),
    filterIecFreeAttributes(),
    verifyEulaCompliance(),
    verifyNoJsxWhitespaceBugs(),
  ];
}

/**
 * Helper: the standard "acquire → fix → verify" sequence for CI release
 * fetches, with local-copy fallback on 404.
 */
export function releaseAcquireFixVerify(): Stage[] {
  // The release stage includes its own 404 fallback inside the runner;
  // see acquireFromRelease. Tests can compose stages differently if
  // they want to assert the fallback path explicitly.
  return [
    skipIfCommitted,
    acquireFromRelease(),
    fixOceanRunnerIrbis(),
    filterIecFreeAttributes(),
    verifyEulaCompliance(),
    verifyNoJsxWhitespaceBugs(),
  ];
}

// Re-export for callers that want the primitive types alongside.
export type { Stage, StageContext, StageResult };
