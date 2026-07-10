// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach, vi } from "vitest";
import CopyButton from "~/components/islands/CopyButton.vue";

describe("CopyButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  it("renders the label visually hidden when idle", () => {
    const wrapper = mount(CopyButton, {
      props: { value: "AAA001", label: "Copy" },
    });
    expect(wrapper.find("button").exists()).toBe(true);
    expect(wrapper.find(".sr-only").text()).toBe("Copy");
  });

  it("writes to the clipboard on click and shows Copied feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const wrapper = mount(CopyButton, {
      props: { value: "AAA001", label: "Copy IRDI" },
    });

    await wrapper.find("button").trigger("click");
    vi.advanceTimersByTime(100);
    await wrapper.vm.$nextTick();

    expect(writeText).toHaveBeenCalledWith("AAA001");
    expect(wrapper.find("[aria-live='polite']").exists()).toBe(true);
  });

  it("silently no-ops when clipboard API is unavailable", async () => {
    const original = (globalThis.navigator as any).clipboard;
    delete (globalThis.navigator as any).clipboard;

    const wrapper = mount(CopyButton, {
      props: { value: "AAA001", label: "Copy" },
    });

    await expect(
      wrapper.find("button").trigger("click"),
    ).resolves.toBeUndefined();

    (globalThis.navigator as any).clipboard = original;
  });

  it("uses the value in the aria-label when copied", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const wrapper = mount(CopyButton, {
      props: { value: "0112/2///61360_4#AAA006", label: "Copy IRDI" },
    });

    await wrapper.find("button").trigger("click");
    vi.advanceTimersByTime(100);
    await wrapper.vm.$nextTick();
    expect(wrapper.find("button").attributes("aria-label")).toContain(
      "0112/2///61360_4#AAA006",
    );
  });
});
