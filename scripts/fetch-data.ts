#!/usr/bin/env tsx
/**
 * Fetch-data orchestrator — acquires the browser's JSON snapshot via
 * the build pipeline and runs the standard fix + verify stages.
 *
 * Three modes, in order of preference:
 *
 *   1. Committed data present    → skip acquire entirely, just run fix + verify.
 *   2. CDD_DATA_RELEASE=<tag>    → fetch from opencdd/cdd-data Releases (fall back to local on failure).
 *   3. default                    → copy from ../cdd-data/data (local dev).
 *
 * The actual stages live in `src/lib/build/stages.ts`; this script is
 * a thin CLI wrapper. Tests construct a `StageContext` and call
 * `runPipeline(stages, ctx)` directly without spawning this process.
 */

import { contextFromCwd, runPipeline, committedDataPresent } from "../src/lib/build/pipeline";
import {
  acquireFromLocal,
  acquireFromRelease,
  fixOceanRunnerIrbis,
  verifyNoJsxWhitespaceBugs,
} from "../src/lib/build/stages";

function log(msg: string): void {
  process.stdout.write(`[fetch-data] ${msg}\n`);
}

function fail(msg: string): never {
  process.stderr.write(`[fetch-data] FAILED: ${msg}\n`);
  process.exit(1);
}

const ctx = contextFromCwd();
ctx.log = log;
const CDD_DATA_RELEASE = ctx.env?.CDD_DATA_RELEASE;

const fixAndVerify = [fixOceanRunnerIrbis(), verifyNoJsxWhitespaceBugs()];

try {
  // Mode 1: data already committed (CI fast path). Skip acquire.
  if (committedDataPresent(ctx)) {
    log("committed data present — skipping acquire stages");
    await runPipeline(fixAndVerify, ctx);
    process.exit(0);
  }

  // Mode 2: release fetch with local fallback.
  if (CDD_DATA_RELEASE) {
    try {
      await runPipeline(
        [acquireFromRelease(), ...fixAndVerify],
        ctx,
      );
      process.exit(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`release fetch failed (${msg.split("\n")[0]}) — falling back to local source.`);
      // Fall through to mode 3.
    }
  }

  // Mode 3: local copy.
  await runPipeline(
    [acquireFromLocal(), ...fixAndVerify],
    ctx,
  );
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
