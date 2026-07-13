// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import FilterablePropertyList, {
  type PropertyListItem,
} from "~/components/islands/FilterablePropertyList.vue";

function makeProps(count: number): PropertyListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    code: `AAD${String(i + 1).padStart(3, "0")}`,
    name: `Property ${i + 1}`,
    href: `/d/test/p/AAD${String(i + 1).padStart(3, "0")}`,
    definition: `Definition for property ${i + 1}`,
    dataTypeLabel: "STRING_TYPE",
    unitName: null,
    unitHref: null,
  }));
}

describe("FilterablePropertyList", () => {
  it("renders all properties as articles with linked names", () => {
    const items = makeProps(3);
    const wrapper = mount(FilterablePropertyList, { props: { items } });

    const articles = wrapper.findAll("article");
    expect(articles).toHaveLength(3);
    const links = wrapper.findAll("article a");
    expect(links).toHaveLength(3);
    expect(links[0]!.attributes("href")).toBe("/d/test/p/AAD001");
  });

  it("renders code badge and definition for each property", () => {
    const items: PropertyListItem[] = [
      {
        code: "AAD001",
        name: "Rated voltage",
        href: "/d/test/p/AAD001",
        definition: "The maximum voltage.",
        dataTypeLabel: "REAL_MEASURE_TYPE",
        unitName: "Volt",
        unitHref: "/d/test/u/AAU001",
      },
    ];
    const wrapper = mount(FilterablePropertyList, { props: { items } });

    expect(wrapper.find("code").text()).toBe("AAD001");
    expect(wrapper.text()).toContain("The maximum voltage.");
    expect(wrapper.text()).toContain("REAL_MEASURE_TYPE");
    expect(wrapper.text()).toContain("Volt");
  });

  it("renders unit as a link when unitHref is provided", () => {
    const items: PropertyListItem[] = [
      {
        code: "AAD001",
        name: "Voltage",
        href: "/d/test/p/AAD001",
        definition: null,
        dataTypeLabel: null,
        unitName: "Volt",
        unitHref: "/d/test/u/AAU001",
      },
    ];
    const wrapper = mount(FilterablePropertyList, { props: { items } });

    const unitLink = wrapper.find('a[href="/d/test/u/AAU001"]');
    expect(unitLink.exists()).toBe(true);
    expect(unitLink.text()).toBe("Volt");
  });

  it("hides search input when items ≤ 6", () => {
    const items = makeProps(5);
    const wrapper = mount(FilterablePropertyList, { props: { items } });

    expect(wrapper.find('input[type="search"]').exists()).toBe(false);
  });

  it("shows search input when items > 6", () => {
    const items = makeProps(7);
    const wrapper = mount(FilterablePropertyList, { props: { items } });

    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
  });

  it("filters by code", async () => {
    const items = makeProps(10);
    const wrapper = mount(FilterablePropertyList, { props: { items } });

    await wrapper.find('input[type="search"]').setValue("AAD003");

    expect(wrapper.findAll("article")).toHaveLength(1);
    expect(wrapper.text()).toContain("Property 3");
  });

  it("filters by name", async () => {
    const items = makeProps(10);
    const wrapper = mount(FilterablePropertyList, { props: { items } });

    await wrapper.find('input[type="search"]').setValue("Property 7");

    expect(wrapper.findAll("article")).toHaveLength(1);
  });

  it("filters by definition text", async () => {
    const items = makeProps(10);
    const wrapper = mount(FilterablePropertyList, { props: { items } });

    await wrapper.find('input[type="search"]').setValue("Definition for property 5");

    expect(wrapper.findAll("article")).toHaveLength(1);
  });

  it("shows no-matches message when filter yields nothing", async () => {
    const items = makeProps(7);
    const wrapper = mount(FilterablePropertyList, { props: { items } });

    await wrapper.find('input[type="search"]').setValue("nonexistent");

    expect(wrapper.text()).toContain("No matches");
    expect(wrapper.findAll("article")).toHaveLength(0);
  });

  it("shows filtered / total count", async () => {
    const items = makeProps(10);
    const wrapper = mount(FilterablePropertyList, { props: { items } });

    expect(wrapper.text()).toContain("10 / 10");

    await wrapper.find('input[type="search"]').setValue("AAD005");
    expect(wrapper.text()).toContain("1 / 10");
  });

  it("wraps in details/summary when collapsable is true", () => {
    const items = makeProps(3);
    const wrapper = mount(FilterablePropertyList, {
      props: { items, collapsable: true, label: "Inherited properties" },
    });

    expect(wrapper.find("details").exists()).toBe(true);
    expect(wrapper.find("summary").text()).toContain("Inherited properties");
    expect(wrapper.find("summary").text()).toContain("3");
  });

  it("hides search input in collapsable mode even with many items", () => {
    const items = makeProps(10);
    const wrapper = mount(FilterablePropertyList, {
      props: { items, collapsable: true, label: "Inherited" },
    });

    expect(wrapper.find('input[type="search"]').exists()).toBe(false);
  });

  it("shows empty message when items is empty and empty prop is set", () => {
    const wrapper = mount(FilterablePropertyList, {
      props: { items: [], empty: "No properties." },
    });

    expect(wrapper.text()).toContain("No properties.");
    expect(wrapper.find("article").exists()).toBe(false);
  });
});
