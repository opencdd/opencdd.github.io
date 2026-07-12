import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  contextFromCwd,
  runPipeline,
  stage,
  type StageContext,
  committedDataPresent,
} from "~/lib/build/pipeline";
import { skipIfCommitted, acquireFromLocal, fixOceanRunnerIrbis } from "~/lib/build/stages";

function makeTempContext(): { ctx: StageContext; cleanup: () => void } {
  const tmp = mkdtempSync(join(tmpdir(), "opencdd-pipeline-"));
  const repoRoot = join(tmp, "repo");
  const dataTarget = join(repoRoot, "src/content/data");
  mkdirSync(dataTarget, { recursive: true });
  const ctx: StageContext = {
    repoRoot,
    dataTarget,
    env: {},
    log: () => {},
  };
  const cleanup: () => void = () => rmSync(tmp, { recursive: true, force: true });
  return { ctx, cleanup };
}

describe("BuildPipeline", () => {
  describe("runPipeline", () => {
    it("runs stages in sequence", async () => {
      const calls: string[] = [];
      const stages = [
        stage("one", () => { calls.push("one"); return { ok: true as const }; }),
        stage("two", () => { calls.push("two"); return { ok: true as const }; }),
        stage("three", () => { calls.push("three"); return { ok: true as const }; }),
      ];
      await runPipeline(stages, contextFromCwd());
      expect(calls).toEqual(["one", "two", "three"]);
    });

    it("throws with stage name on first failure", async () => {
      const stages = [
        stage("good", () => ({ ok: true as const })),
        stage("bad", () => ({ ok: false as const, error: "boom" })),
        stage("never-runs", () => ({ ok: true as const })),
      ];
      await expect(runPipeline(stages, contextFromCwd())).rejects.toThrow(
        'stage "bad" failed: boom',
      );
    });

    it("converts thrown exceptions to ok:false", async () => {
      const stages = [
        stage("throws", () => { throw new Error("kaboom"); }),
      ];
      await expect(runPipeline(stages, contextFromCwd())).rejects.toThrow(
        'stage "throws" failed: kaboom',
      );
    });

    it("logs each stage outcome via ctx.log", async () => {
      const lines: string[] = [];
      const ctx = { ...contextFromCwd(), log: (m: string) => lines.push(m) };
      const stages = [
        stage("alpha", () => ({ ok: true as const, message: "did the thing" })),
        stage("beta", () => ({ ok: true as const, skipped: true, message: "no-op" })),
      ];
      await runPipeline(stages, ctx);
      expect(lines).toEqual([
        "[alpha] ok — did the thing",
        "[beta] skipped — no-op",
      ]);
    });
  });

  describe("skipIfCommitted stage", () => {
    let ctx: StageContext;
    let cleanup!: () => void;

    beforeEach(() => { ({ ctx, cleanup } = makeTempContext()); });
    afterEach(() => cleanup());

    it("skips when index.json exists", async () => {
      writeFileSync(join(ctx.dataTarget, "index.json"), '{"dictionaries":[]}');
      const result = await skipIfCommitted.run(ctx);
      expect(result).toEqual({
        ok: true,
        skipped: true,
        message: "committed data present",
      });
    });

    it("does not skip when index.json is absent", async () => {
      const result = await skipIfCommitted.run(ctx);
      expect(result.ok).toBe(true);
      expect("skipped" in result).toBe(false);
    });
  });

  describe("committedDataPresent", () => {
    let ctx: StageContext;
    let cleanup!: () => void;

    beforeEach(() => { ({ ctx, cleanup } = makeTempContext()); });
    afterEach(() => cleanup());

    it("returns true when index.json exists", () => {
      writeFileSync(join(ctx.dataTarget, "index.json"), "{}");
      expect(committedDataPresent(ctx)).toBe(true);
    });

    it("returns false when index.json is absent", () => {
      expect(committedDataPresent(ctx)).toBe(false);
    });
  });

  describe("acquireFromLocal stage", () => {
    let ctx: StageContext;
    let cleanup!: () => void;

    beforeEach(() => {
      ({ ctx, cleanup } = makeTempContext());
      // Make a fake ../cdd-data/data next to repoRoot
      const fakeCddData = join(ctx.repoRoot, "..", "cdd-data", "data");
      mkdirSync(fakeCddData, { recursive: true });
      writeFileSync(join(fakeCddData, "index.json"), '{"dictionaries":[]}');
      writeFileSync(join(fakeCddData, "marker.txt"), "from-source");
    });
    afterEach(() => cleanup());

    it("copies ../cdd-data/data into dataTarget", async () => {
      const result = await acquireFromLocal().run(ctx);
      expect(result.ok).toBe(true);
      expect(committedDataPresent(ctx)).toBe(true);
    });

    it("fails when local source does not exist", async () => {
      // Move the fake source out of the way for this case
      rmSync(join(ctx.repoRoot, "..", "cdd-data"), { recursive: true, force: true });
      const result = await acquireFromLocal().run(ctx);
      expect(result.ok).toBe(false);
    });
  });

  describe("fixOceanRunnerIrbis stage", () => {
    let ctx: StageContext;
    let cleanup!: () => void;

    beforeEach(() => { ({ ctx, cleanup } = makeTempContext()); });
    afterEach(() => cleanup());

    it("skips gracefully when no oceanrunner data exists", async () => {
      const result = await fixOceanRunnerIrbis().run(ctx);
      expect(result).toEqual({
        ok: true,
        skipped: true,
        message: "no oceanrunner data",
      });
    });
  });
});
