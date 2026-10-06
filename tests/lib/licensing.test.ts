import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { StageContext } from "~/lib/build/pipeline";
import {
  dictLicenseRegime,
  bulkDistributionAllowed,
  isPubliclyServed,
  filterEntityPayload,
  findEulaViolations,
} from "~/lib/licensing";
import {
  filterIecFreeAttributes,
  verifyEulaCompliance,
} from "~/lib/build/stages";

describe("dictLicenseRegime", () => {
  it("treats OceanRunner as OpenCDD's own data", () => {
    expect(dictLicenseRegime("oceanrunner")).toBe("opencdd-own");
  });

  it("treats the IEC 62720 units dictionary as EULA-full", () => {
    expect(dictLicenseRegime("iec62720")).toBe("eula-full");
    expect(dictLicenseRegime("iec-62720")).toBe("eula-full");
  });

  it("defaults unknown and IEC dictionaries to free-attributes-only", () => {
    expect(dictLicenseRegime("iec61360")).toBe("eula-free-attributes");
    expect(dictLicenseRegime("iec-61987")).toBe("eula-free-attributes");
    expect(dictLicenseRegime("iso-ics")).toBe("eula-free-attributes");
    expect(dictLicenseRegime("something-new")).toBe("eula-free-attributes");
  });

  it("allows bulk distribution only outside the restricted regime", () => {
    expect(bulkDistributionAllowed("oceanrunner")).toBe(true);
    expect(bulkDistributionAllowed("iec62720")).toBe(true);
    expect(bulkDistributionAllowed("iec61360")).toBe(false);
  });

  it("never serves the ISO/CS dictionary publicly, in any spelling", () => {
    expect(isPubliclyServed("iso-ics")).toBe(false);
    expect(isPubliclyServed("isoics")).toBe(false);
    expect(isPubliclyServed("iec61360")).toBe(true);
    expect(isPubliclyServed("oceanrunner")).toBe(true);
  });
});

describe("filterEntityPayload", () => {
  it("keeps only whitelisted free attributes — everything else is dropped", () => {
    const entity = {
      irdi: "0112/2///61360_4#AAA001",
      code: "AAA001",
      version: "001",
      revision: "01",
      preferred_name: "Vehicle",
      short_name: "Veh",
      synonyms: ["Car"],
      value_format: "STRING",
      data_type: "STRING",
      definition: "A self-propelled road vehicle.",
      definition_ml: { de: "Ein selbstfahrendes Straßenfahrzeug." },
      remark: "See also IEC 60050.",
      published_in: "IEC 61360-4",
      dates: { release: "2000-01-01" },
      status_level: "standard",
      publisher: "IEC",
      responsible_committee: "SC3D",
      raw_properties: { MDC_P006: "A self-propelled road vehicle." },
      version_meta: { current: "001" },
      note: "A note is the remark attribute.",
      note_ml: { de: "Eine Anmerkung." },
      source_document: "IEC 60050-101",
      applicable_documents: ["IEC 60050"],
      imported_documents: ["IEC 60050"],
      change_request_id: "CR-0001",
      class_type: "component",
      simplified_drawing: "<svg>…</svg>",
      formula: "P = U · I",
      condition: "U > 0",
      constraint: "STRING (5)",
      some_future_field: "added by a future exporter",
    };
    const out = filterEntityPayload(entity);
    expect(Object.keys(out).sort()).toEqual([
      "code",
      "data_type",
      "irdi",
      "preferred_name",
      "revision",
      "short_name",
      "synonyms",
      "value_format",
      "version",
    ]);
  });

  it("reduces version_history entries to version/revision/is_current", () => {
    const out = filterEntityPayload({
      irdi: "x",
      version_history: [
        {
          version: "001",
          revision: "01",
          status: "standard",
          timestamp: "2020-01-07 21:31:33",
          user: "BATCH 00000739",
          unid: "07ABE082E6D23A58C12584E80070C0D1",
          is_current: true,
        },
      ],
    });
    expect(out.version_history).toEqual([
      { version: "001", revision: "01", is_current: true },
    ]);
  });
});

describe("findEulaViolations", () => {
  it("flags every key outside the § 5 whitelist — fails closed", () => {
    const violations = findEulaViolations([
      { irdi: "a", code: "A", definition: "nope" },
      { irdi: "b", some_future_field: "leak" },
      {
        irdi: "c",
        version_history: [{ version: "001", revision: "01", unid: "U" }],
      },
    ]);
    expect(violations).toEqual([
      "a: definition",
      "b: some_future_field",
      "c: version_history.unid",
    ]);
  });

  it("accepts a compliant database", () => {
    expect(
      findEulaViolations([
        {
          irdi: "a",
          code: "A",
          preferred_name: "Fine",
          version_history: [{ version: "001", revision: "01", is_current: true }],
        },
      ]),
    ).toEqual([]);
  });
});

describe("EULA filter + verify stages", () => {
  function makeTempContext(): { ctx: StageContext; cleanup: () => void } {
    const tmp = mkdtempSync(join(tmpdir(), "opencdd-eula-"));
    const dataTarget = join(tmp, "src/content/data");
    mkdirSync(dataTarget, { recursive: true });
    const ctx: StageContext = { repoRoot: tmp, dataTarget, env: {}, log: () => {} };
    return { ctx, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
  }

  let ctx: StageContext;
  let cleanup: () => void;
  beforeEach(() => {
    ({ ctx, cleanup } = makeTempContext());
  });
  afterEach(() => cleanup());

  function seedDict(name: string, entities: unknown[], withBulk = false): void {
    const dir = join(ctx.dataTarget, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "database.json"), JSON.stringify(entities));
    if (withBulk) {
      mkdirSync(join(dir, "versions", "AAA001"), { recursive: true });
      writeFileSync(join(dir, "versions", "AAA001", "x.json"), "{}");
      mkdirSync(join(dir, "parcel"), { recursive: true });
      writeFileSync(join(dir, "parcel", "D.xlsx"), "zip");
    }
  }

  it("filters restricted dicts, removes bulk artifacts in data and public trees, leaves allowed dicts untouched", async () => {
    seedDict(
      "iec61360",
      [{ irdi: "a", code: "A", definition: "secret", version_history: [{ version: "001", revision: "01", unid: "U" }] }],
      true,
    );
    seedDict("oceanrunner", [{ irdi: "o", definition: "ours to keep" }]);
    seedDict("iec62720", [{ irdi: "u", definition: "free per §6" }]);
    // Stale public-tree artifacts under a different spelling.
    const stalePublic = resolve(ctx.repoRoot, "public/d/iec61360/versions");
    mkdirSync(stalePublic, { recursive: true });
    writeFileSync(join(stalePublic, "x.json"), "{}");

    const filterResult = await filterIecFreeAttributes().run(ctx);
    expect(filterResult.ok).toBe(true);

    const filtered = JSON.parse(
      readFileSync(join(ctx.dataTarget, "iec61360/database.json"), "utf8"),
    );
    expect(filtered[0].definition).toBeUndefined();
    expect(filtered[0].version_history[0].unid).toBeUndefined();
    expect(filtered[0].code).toBe("A");
    expect(existsSync(join(ctx.dataTarget, "iec61360/versions"))).toBe(false);
    expect(existsSync(join(ctx.dataTarget, "iec61360/parcel"))).toBe(false);
    expect(existsSync(stalePublic)).toBe(false);

    expect(
      JSON.parse(readFileSync(join(ctx.dataTarget, "oceanrunner/database.json"), "utf8")),
    ).toEqual([{ irdi: "o", definition: "ours to keep" }]);
    expect(
      JSON.parse(readFileSync(join(ctx.dataTarget, "iec62720/database.json"), "utf8")),
    ).toEqual([{ irdi: "u", definition: "free per §6" }]);

    const verifyResult = await verifyEulaCompliance().run(ctx);
    expect(verifyResult.ok).toBe(true);
  });

  it("verify stage fails when restricted content would be served", async () => {
    seedDict("iec61360", [{ irdi: "a", definition: "not allowed" }], true);
    const result = await verifyEulaCompliance().run(ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("iec61360/a: definition");
      expect(result.error).toContain("versions");
    }
  });

  it("filter stage is idempotent", async () => {
    seedDict("iec61360", [{ irdi: "a", code: "A", remark: "r" }]);
    await filterIecFreeAttributes().run(ctx);
    const once = readFileSync(join(ctx.dataTarget, "iec61360/database.json"), "utf8");
    await filterIecFreeAttributes().run(ctx);
    expect(readFileSync(join(ctx.dataTarget, "iec61360/database.json"), "utf8")).toBe(once);
  });
});
