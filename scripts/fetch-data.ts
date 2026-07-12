#!/usr/bin/env tsx
/**
 * Fetch-data orchestrator — acquires the browser's JSON snapshot via
 * the build pipeline and runs the standard fix + verify stages.
 *
 * Two top-level modes, controlled by env:
 *
 *   CDD_DATA_RELEASE=<tag|latest>   → release fetch (404 falls back to local)
 *   default                          → local copy from ../cdd-data/data
 *
 * The actual stages live in `src/lib/build/stages.ts`; this script is
 * a thin CLI wrapper. Tests construct a `StageContext` and call
 * `runPipeline(stages, ctx)` directly without spawning this process.
 */

import { contextFromCwd, runPipeline } from "../src/lib/build/pipeline";
import {
  acquireFromLocal,
  acquireFromRelease,
  fixOceanRunnerIrbis,
  skipIfCommitted,
  verifyNoJsxWhitespaceBugs,
} from "../src/lib/build/stages";

function log(msg: string): void {
  process.stdout.write(`[fetch-data] ${msg}\n`);
}

const ctx = contextFromCwd();
ctx.log = log;

const CDD_DATA_RELEASE = ctx.env?.CDD_DATA_RELEASE;

try {
  if (CDD_DATA_RELEASE) {
    try {
      await runPipeline(
        [skipIfCommitted, acquireFromRelease(), fixOceanRunnerIrbis(), verifyNoJsxWhitespaceBugs()],
        ctx,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.includes("not found")) {
        log("Release not found — falling back to local source.");
        await runPipeline(
          [skipIfCommitted, acquireFromLocal(), fixOceanRunnerIrbis(), verifyNoJsxWhitespaceBugs()],
          ctx,
        );
      } else {
        throw err;
      }
    }
  } else {
    await runPipeline(
      [skipIfCommitted, acquireFromLocal(), fixOceanRunnerIrbis(), verifyNoJsxWhitespaceBugs()],
      ctx,
    );
  }
} catch (err) {
  process.stderr.write(`[fetch-data] FAILED: ${(err as Error).message}\n`);
  process.exit(1);
}
