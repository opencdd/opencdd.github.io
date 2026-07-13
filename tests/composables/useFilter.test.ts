// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ref, nextTick } from "vue";
import { useFilter } from "~/composables/useFilter";

describe("useFilter", () => {
  it("returns all items when query is empty", () => {
    const items = ref([
      { code: "AAA001", name: "Voltage" },
      { code: "AAA002", name: "Current" },
    ]);
    const { filtered, query } = useFilter(items, (item) => [item.code, item.name]);

    expect(query.value).toBe("");
    expect(filtered.value).toHaveLength(2);
  });

  it("filters by code match", async () => {
    const items = ref([
      { code: "AAA001", name: "Voltage" },
      { code: "AAA002", name: "Current" },
    ]);
    const { filtered, query } = useFilter(items, (item) => [item.code, item.name]);

    query.value = "AAA002";
    await nextTick();

    expect(filtered.value).toHaveLength(1);
    expect(filtered.value[0]!.code).toBe("AAA002");
  });

  it("filters by name match", async () => {
    const items = ref([
      { code: "AAA001", name: "Rated voltage" },
      { code: "AAA002", name: "Rated current" },
    ]);
    const { filtered, query } = useFilter(items, (item) => [item.code, item.name]);

    query.value = "current";
    await nextTick();

    expect(filtered.value).toHaveLength(1);
    expect(filtered.value[0]!.name).toBe("Rated current");
  });

  it("is case-insensitive", async () => {
    const items = ref([
      { code: "AAA001", name: "Voltage" },
      { code: "AAA002", name: "Current" },
    ]);
    const { filtered, query } = useFilter(items, (item) => [item.code, item.name]);

    query.value = "VOLTAGE";
    await nextTick();

    expect(filtered.value).toHaveLength(1);
    expect(filtered.value[0]!.name).toBe("Voltage");
  });

  it("trims whitespace before matching", async () => {
    const items = ref([
      { code: "AAA001", name: "Voltage" },
    ]);
    const { filtered, query } = useFilter(items, (item) => [item.code, item.name]);

    query.value = "  voltage  ";
    await nextTick();

    expect(filtered.value).toHaveLength(1);
  });

  it("returns empty array when no match", async () => {
    const items = ref([
      { code: "AAA001", name: "Voltage" },
    ]);
    const { filtered, query } = useFilter(items, (item) => [item.code, item.name]);

    query.value = "nonexistent";
    await nextTick();

    expect(filtered.value).toHaveLength(0);
  });

  it("supports multiple field extraction", async () => {
    const items = ref([
      { code: "AAA001", name: "Voltage", definition: "The electrical pressure" },
      { code: "AAA002", name: "Current", definition: "The flow rate" },
    ]);
    const { filtered, query } = useFilter(items, (item) => [
      item.code,
      item.name,
      item.definition,
    ]);

    query.value = "pressure";
    await nextTick();

    expect(filtered.value).toHaveLength(1);
    expect(filtered.value[0]!.code).toBe("AAA001");
  });

  it("reacts to items ref changes", async () => {
    const items = ref([{ code: "AAA001", name: "Voltage" }]);
    const { filtered } = useFilter(items, (item) => [item.code, item.name]);

    expect(filtered.value).toHaveLength(1);

    items.value = [
      { code: "AAA001", name: "Voltage" },
      { code: "AAA002", name: "Current" },
    ];
    await nextTick();

    expect(filtered.value).toHaveLength(2);
  });

  it("handles empty items array", () => {
    const items = ref([] as Array<{ code: string; name: string }>);
    const { filtered } = useFilter(items, (item) => [item.code, item.name]);

    expect(filtered.value).toHaveLength(0);
  });
});
