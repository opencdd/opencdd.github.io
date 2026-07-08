/** Platform detection for keyboard shortcut labels. */

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const p = (navigator.platform ?? "") + " " + (navigator.userAgent ?? "");
  return /Mac|iPhone|iPad|iPod/i.test(p);
}

export function platformModifierLabel(): string {
  return isApplePlatform() ? "⌘" : "Ctrl";
}
