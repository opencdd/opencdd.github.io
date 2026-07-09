// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/preact";
import CopyButton from "~/components/islands/CopyButton.tsx";

describe("CopyButton", () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders a button with an accessible label", () => {
    const { getByRole } = render(<CopyButton value="AAA001" label="Copy IRDI" />);
    expect(getByRole("button", { name: "Copy IRDI" })).toBeTruthy();
  });

  it("renders the screen-reader label text when no copy has happened yet", () => {
    const { container } = render(<CopyButton value="AAA001" label="Copy IRDI" />);
    const sr = container.querySelector(".sr-only");
    expect(sr?.textContent).toBe("Copy IRDI");
  });

  it("calls clipboard.writeText with the value when clicked", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const { getByRole } = render(<CopyButton value="AAA001" label="Copy IRDI" />);
    fireEvent.click(getByRole("button"));

    expect(writeText).toHaveBeenCalledWith("AAA001");
  });

  it("silently no-ops when clipboard API is unavailable", () => {
    const original = (globalThis.navigator as any).clipboard;
    delete (globalThis.navigator as any).clipboard;

    const { getByRole } = render(<CopyButton value="AAA001" label="Copy" />);
    expect(() => fireEvent.click(getByRole("button"))).not.toThrow();

    (globalThis.navigator as any).clipboard = original;
  });
});
