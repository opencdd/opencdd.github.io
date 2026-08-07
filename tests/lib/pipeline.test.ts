import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  contextFromCwd,
  runPipeline,
  stage,
  type StageContext,
  committedDataPresent,
} from "~/lib/build/pipeline";
import { skipIfCommitted, acquireFromLocal, fixOceanRunnerIrbis, normalizeLanguageCodes } from "~/lib/build/stages";

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
      // Make a fake ../data-private/data next to repoRoot
      const fakeCddData = join(ctx.repoRoot, "..", "data-private", "data");
      mkdirSync(fakeCddData, { recursive: true });
      writeFileSync(join(fakeCddData, "index.json"), '{"dictionaries":[]}');
      writeFileSync(join(fakeCddData, "marker.txt"), "from-source");
    });
    afterEach(() => cleanup());

    it("copies ../data-private/data into dataTarget", async () => {
      const result = await acquireFromLocal().run(ctx);
      expect(result.ok).toBe(true);
      expect(committedDataPresent(ctx)).toBe(true);
    });

    it("fails when local source does not exist", async () => {
      // Move the fake source out of the way for this case
      rmSync(join(ctx.repoRoot, "..", "data-private"), { recursive: true, force: true });
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

  describe("normalizeLanguageCodes stage", () => {
    let ctx: StageContext;
    let cleanup!: () => void;

    beforeEach(() => { ({ ctx, cleanup } = makeTempContext()); });
    afterEach(() => cleanup());

    it("renames jp to ja on all _ml fields in database.json", async () => {
      mkdirSync(join(ctx.dataTarget, "mldict"), { recursive: true });
      const nodes = [
        {
          irdi: "X#ACE061",
          code: "ACE061",
          type: "property",
          preferred_name: "mean operating time to failure",
          preferred_name_ml: {
            en: "mean operating time to failure",
            de: "mittlere Betriebszeit bis zum Ausfall",
            fr: "durée moyenne de fonctionnement avant défaillance",
            jp: "平均故障間動作時間",
            zh: "平均失效前工作时间",
          },
          definition_ml: {
            en: "expectation of the operating time to failure",
            jp: "故障までの平均動作時間",
          },
          short_name_ml: { en: "MTTF", jp: "MTTF" },
        },
      ];
      const dbPath = join(ctx.dataTarget, "mldict", "database.json");
      writeFileSync(dbPath, JSON.stringify(nodes));

      const result = await normalizeLanguageCodes().run(ctx);
      expect(result.ok).toBe(true);

      const after = JSON.parse(readFileSync(dbPath, "utf8")) as Array<Record<string, unknown>>;
      const entity = after[0]!;
      const pnml = entity.preferred_name_ml as Record<string, string>;
      expect(pnml.ja).toBe("平均故障間動作時間");
      expect(pnml.jp).toBeUndefined();
      expect(pnml.en).toBe("mean operating time to failure");

      const dml = entity.definition_ml as Record<string, string>;
      expect(dml.ja).toBe("故障までの平均動作時間");
      expect(dml.jp).toBeUndefined();

      const snml = entity.short_name_ml as Record<string, string>;
      expect(snml.ja).toBe("MTTF");
      expect(snml.jp).toBeUndefined();
    });

    it("preserves an existing ja key when both jp and ja are present", async () => {
      mkdirSync(join(ctx.dataTarget, "mldict"), { recursive: true });
      const nodes = [
        {
          irdi: "X#C", code: "C", type: "class",
          preferred_name: "test",
          preferred_name_ml: { ja: "正しい", jp: "間違い" },
        },
      ];
      const dbPath = join(ctx.dataTarget, "mldict", "database.json");
      writeFileSync(dbPath, JSON.stringify(nodes));

      await normalizeLanguageCodes().run(ctx);

      const after = JSON.parse(readFileSync(dbPath, "utf8")) as Array<Record<string, unknown>>;
      const pnml = after[0]!.preferred_name_ml as Record<string, string>;
      expect(pnml.ja).toBe("正しい");
      expect(pnml.jp).toBeUndefined();
    });

    it("skips when no non-standard codes are found", async () => {
      mkdirSync(join(ctx.dataTarget, "cleandict"), { recursive: true });
      writeFileSync(
        join(ctx.dataTarget, "cleandict", "database.json"),
        JSON.stringify([
          { irdi: "X#A", code: "A", type: "class", preferred_name_ml: { en: "hello", ja: "こんにちは" } },
        ]),
      );

      const result = await normalizeLanguageCodes().run(ctx);
      expect(result.ok).toBe(true);
      expect(result).toHaveProperty("skipped", true);
    });
  });
});
