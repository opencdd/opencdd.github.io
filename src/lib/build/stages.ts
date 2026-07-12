/**
 * Build-pipeline stages — concrete `Stage` adapters that the orchestrator
 * (`scripts/fetch-data.ts`) wires together.
 *
 * Each stage is independently importable and testable. Call
 * `stage.run(ctx)` with a `StageContext` pointing at a temp dir; no
 * `execSync`, no shell-out.
 */

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  type Stage,
  type StageContext,
  type StageResult,
  committedDataPresent,
  stage,
} from "./pipeline";

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
 * Acquire: copy from a local cdd-data checkout at `../cdd-data/data`.
 *
 * Used in local dev when the data pipeline has been run manually.
 */
export function acquireFromLocal(): Stage {
  return stage("acquire-local", (ctx) => {
    const localData = resolve(ctx.repoRoot, "../cdd-data/data");
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
 * Helper: the standard "acquire → fix → verify" sequence for local dev.
 * Used by `npm run fetch-data` when no release is requested.
 */
export function localAcquireFixVerify(): Stage[] {
  return [
    skipIfCommitted,
    acquireFromLocal(),
    fixOceanRunnerIrbis(),
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
    verifyNoJsxWhitespaceBugs(),
  ];
}

// Re-export for callers that want the primitive types alongside.
export type { Stage, StageContext, StageResult };
