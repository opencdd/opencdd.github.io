/**
 * Build pipeline — a small framework for the data refresh scripts.
 *
 * The browser's data flow has four conceptual stages:
 *
 *   acquire  →  validate  →  fix  →  verify
 *
 * Before this module existed, the four stages were tangled inside one
 * 148-line `fetch-data.ts` script. Fix-ups were invoked via
 * `execSync("npx tsx scripts/fix-oceanrunner-irdis.ts")` — a
 * stringly-typed shell call into the same repo. The audit script
 * (`audit-jsx-whitespace.ts`) was a separate manual command with no
 * shared vocabulary.
 *
 * `BuildPipeline` gives every stage the same shape so the orchestrator
 * can wire them together without caring what each one does. Stages can
 * be tested individually by calling `stage.run(ctx)` with a temp dir —
 * no `execSync`, no shell-out.
 *
 * One adapter = hypothetical seam. We have multiple stages already
 * (oceanrunner fix-up, jsx-whitespace audit, tree generation), so the
 * seam is real — see `/improve-codebase-architecture` candidate 01.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Per-run context handed to every stage. Tests construct one with a
 * temp dir; production constructs one from the repo root.
 */
export interface StageContext {
  /** Absolute path to the repo root. */
  repoRoot: string;
  /** Absolute path to the data target (src/content/data/). */
  dataTarget: string;
  /** Optional logger; defaults to no-op. */
  log?: (message: string) => void;
  /** Environment (for stubbing in tests). Defaults to process.env. */
  env?: Record<string, string | undefined>;
}

/** A stage's outcome. */
export type StageResult =
  | { ok: true; skipped?: boolean; message?: string }
  | { ok: false; error: string };

/** A pipeline stage. Pure interface — no I/O restrictions. */
export interface Stage {
  /** Stable, human-readable name for log output. */
  name: string;
  /** Run the stage. Throw or return ok:false on failure. */
  run(ctx: StageContext): Promise<StageResult> | StageResult;
}

/**
 * Builds a stage from a plain function. Convenience for the common
 * case where the name and the runner are all you need.
 */
export function stage(
  name: string,
  run: (ctx: StageContext) => Promise<StageResult> | StageResult,
): Stage {
  return { name, run };
}

/** Default context constructor — derives paths from cwd. */
export function contextFromCwd(cwd: string = process.cwd()): StageContext {
  return {
    repoRoot: cwd,
    dataTarget: resolve(cwd, "src/content/data"),
    env: process.env,
    log: () => {},
  };
}

/**
 * Runs stages in sequence. Throws on the first failure with the stage
 * name and error message. Calls `ctx.log` (if set) with each stage's
 * outcome so callers can produce human-friendly output.
 */
export async function runPipeline(
  stages: readonly Stage[],
  ctx: StageContext,
): Promise<void> {
  const log = ctx.log ?? (() => {});
  for (const s of stages) {
    let result: StageResult;
    try {
      result = await s.run(ctx);
    } catch (err) {
      result = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
    if (!result.ok) {
      log(`[${s.name}] FAIL: ${result.error}`);
      throw new Error(`stage "${s.name}" failed: ${result.error}`);
    }
    const tag = result.skipped ? "skipped" : "ok";
    log(`[${s.name}] ${tag}${result.message ? ` — ${result.message}` : ""}`);
  }
}

/**
 * Skip-check: returns true if `dataTarget/index.json` already exists.
 * Used by the "skip if committed" acquire stage and by tests that
 * want to verify the gate.
 */
export function committedDataPresent(ctx: StageContext): boolean {
  return existsSync(resolve(ctx.dataTarget, "index.json"));
}
