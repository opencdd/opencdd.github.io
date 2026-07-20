// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import FilterableEntityList, {
  type EntityListItem,
} from "~/components/islands/FilterableEntityList.vue";

function makeItems(count: number): EntityListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    code: `AAA${String(i + 1).padStart(3, "0")}`,
    name: `Entity ${i + 1}`,
    href: `/d/test/c/AAA${String(i + 1).padStart(3, "0")}`,
    resolved: true,
  }));
}

describe("FilterableEntityList", () => {
  it("renders all items as links in a grid", () => {
    const items = makeItems(3);
    const wrapper = mount(FilterableEntityList, { props: { items } });

    const links = wrapper.findAll("a");
    expect(links).toHaveLength(3);
    expect(links[0]!.attributes("href")).toBe("/d/test/c/AAA001");
  });

  it("renders unresolved items as non-link spans", () => {
    const items: EntityListItem[] = [
      {
        code: "AAA001",
        name: "Resolved",
        href: "/d/test/c/AAA001",
        resolved: true,
      },
      {
        code: "AAA002",
        name: "Unresolved",
        href: null,
        resolved: false,
      },
    ];
    const wrapper = mount(FilterableEntityList, { props: { items } });

    expect(wrapper.findAll("a")).toHaveLength(1);
    expect(wrapper.findAll("span.border-rose-300")).toHaveLength(1);
    expect(wrapper.text()).toContain("Not in data");
  });

  it("hides search input when items ≤ 6", () => {
    const items = makeItems(5);
    const wrapper = mount(FilterableEntityList, { props: { items } });

    expect(wrapper.find('input[type="search"]').exists()).toBe(false);
  });

  it("shows search input when items > 6", () => {
    const items = makeItems(7);
    const wrapper = mount(FilterableEntityList, { props: { items } });

    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
  });

  it("filters items by code on search", async () => {
    const items = makeItems(10);
    const wrapper = mount(FilterableEntityList, { props: { items } });

    await wrapper.find('input[type="search"]').setValue("AAA003");

    const links = wrapper.findAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]!.text()).toContain("Entity 3");
  });

  it("filters items by name on search", async () => {
    const items = makeItems(10);
    const wrapper = mount(FilterableEntityList, { props: { items } });

    await wrapper.find('input[type="search"]').setValue("Entity 5");

    const links = wrapper.findAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]!.text()).toContain("AAA005");
  });

  it("shows count of filtered / total", async () => {
    const items = makeItems(10);
    const wrapper = mount(FilterableEntityList, { props: { items } });

    const countEl = wrapper.find(".tabular-nums");
    expect(countEl.text()).toMatch(/10\s*\/\s*10/);

    await wrapper.find('input[type="search"]').setValue("AAA005");
    expect(wrapper.find(".tabular-nums").text()).toMatch(/1\s*\/\s*10/);
  });

  it("shows no-matches message when filter yields nothing", async () => {
    const items = makeItems(7);
    const wrapper = mount(FilterableEntityList, { props: { items } });

    await wrapper.find('input[type="search"]').setValue("nonexistent");

    expect(wrapper.text()).toContain("No matches");
    expect(wrapper.findAll("a")).toHaveLength(0);
  });

  it("search is case-insensitive", async () => {
    const items: EntityListItem[] = [
      { code: "AAA001", name: "Rated Voltage", href: "/d/test/c/AAA001", resolved: true },
      { code: "AAA002", name: "Rated Current", href: "/d/test/c/AAA002", resolved: true },
    ];
    // Force search to appear by adding more items
    items.push(
      ...makeItems(5).map((i) => ({ ...i, name: `${i.name} extra` })),
    );
    const wrapper = mount(FilterableEntityList, { props: { items } });

    await wrapper.find('input[type="search"]').setValue("RATED");

    expect(wrapper.findAll("a")).toHaveLength(2);
  });

  it("shows empty message when items is empty and empty prop is set", () => {
    const wrapper = mount(FilterableEntityList, {
      props: { items: [], empty: "No items found." },
    });

    expect(wrapper.text()).toContain("No items found.");
    expect(wrapper.find("ul").exists()).toBe(false);
  });

  it("renders nothing when items is empty and no empty prop", () => {
    const wrapper = mount(FilterableEntityList, {
      props: { items: [] },
    });

    expect(wrapper.find("ul").exists()).toBe(false);
    expect(wrapper.find(".text-ink-400").exists()).toBe(false);
  });
});
