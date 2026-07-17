import { describe, it, expect } from "vitest";
import { recentChanges, groupByMonth } from "~/lib/recentChanges";
import { makeBundle, makeClass } from "../helpers/factories";

describe("recentChanges", () => {
  it("returns empty for a bundle with no version history", async () => {
    const bundle = await makeBundle([makeClass()]);
    expect(recentChanges(bundle, "test")).toEqual([]);
  });

  it("collects version entries and sorts reverse-chronologically", async () => {
    const bundle = await makeBundle([
      makeClass({
        irdi: "test#AAA001",
        code: "AAA001",
        version_history: [
          { version: "001", revision: "01", status: "standard", timestamp: "2021-01-01 10:00:00", user: null, change_request_id: null, unid: "u1", is_current: false },
          { version: "002", revision: "01", status: "standard", timestamp: "2023-05-15 12:00:00", user: null, change_request_id: null, unid: "u2", is_current: true },
        ],
      }),
    ]);
    const rows = recentChanges(bundle, "test");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.version).toBe("002");
    expect(rows[1]?.version).toBe("001");
  });

  it("builds entity hrefs using the canonical route segment", async () => {
    const bundle = await makeBundle([
      makeClass({
        irdi: "test#AAA001",
        code: "AAA001",
        version_history: [
          { version: "001", revision: "01", status: "standard", timestamp: "2023-01-01 00:00:00", user: null, change_request_id: null, unid: "u1", is_current: true },
        ],
      }),
    ]);
    const rows = recentChanges(bundle, "iec63213");
    expect(rows[0]?.href).toBe("/d/iec63213/c/AAA001/");
  });
});

describe("groupByMonth", () => {
  it("groups rows by YYYY-MM and sorts reverse-chronologically", () => {
    const rows = [
      { timestamp: "2023-05-15 12:00:00", irdi: "a", code: "a", name: "a", type: "class" as const, version: "1", revision: "1", status: "standard", user: null, changeRequestId: null, isCurrent: true, href: "/" },
      { timestamp: "2023-01-01 00:00:00", irdi: "b", code: "b", name: "b", type: "class" as const, version: "1", revision: "1", status: "standard", user: null, changeRequestId: null, isCurrent: true, href: "/" },
      { timestamp: "2023-05-20 12:00:00", irdi: "c", code: "c", name: "c", type: "class" as const, version: "1", revision: "1", status: "standard", user: null, changeRequestId: null, isCurrent: true, href: "/" },
    ];
    const groups = groupByMonth(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.monthKey).toBe("2023-05");
    expect(groups[0]?.rows).toHaveLength(2);
    expect(groups[1]?.monthKey).toBe("2023-01");
  });
});
