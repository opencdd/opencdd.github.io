// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import EntityBrowser, {
  type EntityTab,
} from "~/components/islands/EntityBrowser.vue";

function makeTab(type: string, label: string, count: number): EntityTab {
  return {
    type: type as any,
    label,
    count,
    items: Array.from({ length: count }, (_, i) => ({
      code: `${type.toUpperCase()}${String(i + 1).padStart(3, "0")}`,
      name: `${label.slice(0, -1)} ${i + 1}`,
      href: `/d/test/${type[0]}/${type.toUpperCase()}${String(i + 1).padStart(3, "0")}/`,
    })),
    totalCount: count,
  };
}

describe("EntityBrowser", () => {
  it("renders tab buttons with counts", () => {
    const tabs = [
      makeTab("class", "Classes", 5),
      makeTab("property", "Properties", 3),
    ];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    const tabButtons = wrapper.findAll('[role="tab"]');
    expect(tabButtons).toHaveLength(2);
    expect(tabButtons[0]!.text()).toContain("Classes");
    expect(tabButtons[0]!.text()).toContain("5");
    expect(tabButtons[1]!.text()).toContain("Properties");
    expect(tabButtons[1]!.text()).toContain("3");
  });

  it("renders items for the initial tab", () => {
    const tabs = [
      makeTab("class", "Classes", 3),
      makeTab("property", "Properties", 5),
    ];
    const wrapper = mount(EntityBrowser, {
      props: { tabs, initialTab: "property" },
    });

    const links = wrapper.findAll("a");
    expect(links).toHaveLength(5);
    expect(links[0]!.attributes("href")).toContain("/p/");
  });

  it("switches tabs on click and updates displayed items", async () => {
    const tabs = [
      makeTab("class", "Classes", 3),
      makeTab("property", "Properties", 2),
    ];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    expect(wrapper.findAll("a")).toHaveLength(3); // classes

    const propertyTab = wrapper.findAll('[role="tab"]')[1]!;
    await propertyTab.trigger("click");

    expect(wrapper.findAll("a")).toHaveLength(2); // properties
  });

  it("shows search input with filter count", () => {
    const tabs = [makeTab("class", "Classes", 10)];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
    expect(wrapper.find(".tabular-nums").text()).toMatch(/10\s*\/\s*10/);
  });

  it("filters items via search", async () => {
    const tabs = [makeTab("class", "Classes", 10)];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    await wrapper.find('input[type="search"]').setValue("CLASS003");

    const links = wrapper.findAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]!.text()).toContain("CLASS003");
  });

  it("resets search when switching tabs", async () => {
    const tabs = [
      makeTab("class", "Classes", 10),
      makeTab("property", "Properties", 5),
    ];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    await wrapper.find('input[type="search"]').setValue("CLASS001");
    expect(wrapper.findAll("a")).toHaveLength(1);

    await wrapper.findAll('[role="tab"]')[1]!.trigger("click");
    expect((wrapper.find('input[type="search"]').element as HTMLInputElement).value).toBe("");
    expect(wrapper.findAll("a")).toHaveLength(5);
  });

  it("paginates with show-more button", async () => {
    const tabs = [makeTab("class", "Classes", 120)]; // more than PAGE_SIZE=50
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    expect(wrapper.findAll("a")).toHaveLength(50);

    const showMoreBtn = wrapper.find("button:not([role=tab])");
    expect(showMoreBtn.exists()).toBe(true);

    await showMoreBtn.trigger("click");
    expect(wrapper.findAll("a")).toHaveLength(100);
  });

  it("hides show-more when all items visible", () => {
    const tabs = [makeTab("class", "Classes", 30)]; // less than PAGE_SIZE
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    expect(wrapper.findAll("a")).toHaveLength(30);
    expect(wrapper.find("button:not([role=tab])").exists()).toBe(false);
  });

  it("marks active tab with aria-selected", () => {
    const tabs = [
      makeTab("class", "Classes", 3),
      makeTab("property", "Properties", 2),
    ];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    const tabButtons = wrapper.findAll('[role="tab"]');
    expect(tabButtons[0]!.attributes("aria-selected")).toBe("true");
    expect(tabButtons[1]!.attributes("aria-selected")).toBe("false");
  });

  it("shows no-matches message for empty filter", async () => {
    const tabs = [makeTab("class", "Classes", 5)];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    await wrapper.find('input[type="search"]').setValue("nonexistent");

    expect(wrapper.text()).toContain("No matches");
    expect(wrapper.findAll("a")).toHaveLength(0);
  });

  it("shows capped notice when totalCount exceeds items.length", () => {
    const tab = makeTab("class", "Classes", 3);
    tab.totalCount = 500;
    const wrapper = mount(EntityBrowser, { props: { tabs: [tab] } });

    expect(wrapper.text()).toContain("Showing the first 3 of 500");
    expect(wrapper.text()).toContain("Use search");
  });

  it("hides capped notice when all items are present", () => {
    const tabs = [makeTab("class", "Classes", 10)];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    expect(wrapper.text()).not.toContain("Showing the first");
  });

  it("connects tabs to panel via aria-controls", () => {
    const tabs = [
      makeTab("class", "Classes", 3),
      makeTab("property", "Properties", 2),
    ];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    const classTab = wrapper.find("#tab-class");
    expect(classTab.attributes("aria-controls")).toBe("panel-class");

    const panel = wrapper.find('[role="tabpanel"]');
    expect(panel.attributes("id")).toBe("panel-class");
    expect(panel.attributes("aria-labelledby")).toBe("tab-class");
  });

  it("manages tabindex for roving focus", () => {
    const tabs = [
      makeTab("class", "Classes", 3),
      makeTab("property", "Properties", 2),
    ];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    const classTab = wrapper.find("#tab-class");
    const propertyTab = wrapper.find("#tab-property");

    expect(classTab.attributes("tabindex")).toBe("0");
    expect(propertyTab.attributes("tabindex")).toBe("-1");
  });

  it("switches tab on ArrowRight", async () => {
    const tabs = [
      makeTab("class", "Classes", 3),
      makeTab("property", "Properties", 2),
    ];
    const wrapper = mount(EntityBrowser, { props: { tabs } });

    const classTab = wrapper.find("#tab-class");
    await classTab.trigger("keydown", { key: "ArrowRight" });

    expect(wrapper.find("#tab-property").attributes("aria-selected")).toBe("true");
    expect(wrapper.findAll("a")).toHaveLength(2);
  });

  it("switches tab on ArrowLeft", async () => {
    const tabs = [
      makeTab("class", "Classes", 3),
      makeTab("property", "Properties", 2),
    ];
    const wrapper = mount(EntityBrowser, {
      props: { tabs, initialTab: "property" },
    });

    const propertyTab = wrapper.find("#tab-property");
    await propertyTab.trigger("keydown", { key: "ArrowLeft" });

    expect(wrapper.find("#tab-class").attributes("aria-selected")).toBe("true");
    expect(wrapper.findAll("a")).toHaveLength(3);
  });
});
