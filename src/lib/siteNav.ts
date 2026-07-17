/**
 * Site-wide navigation config.
 *
 * One source of truth for primary nav (Header), footer project nav,
 * and footer external nav. Adding a top-level section means adding a
 * row here — not editing Astro.
 */

export interface NavItem {
  href: string;
  label: string;
  /** Optional: external links open in a new tab. */
  external?: boolean;
}

export const primaryNav: readonly NavItem[] = [
  { href: "/dictionaries", label: "Dictionaries" },
  { href: "/changes", label: "Changes" },
  { href: "/docs/", label: "Docs" },
  { href: "/blog/", label: "Blog" },
  { href: "/about/", label: "About" },
] as const;

export const footerProjectNav: readonly NavItem[] = [
  { href: "/docs/", label: "Documentation" },
  { href: "/blog/", label: "Blog" },
  { href: "/about/", label: "About" },
  { href: "/search", label: "Search" },
] as const;

export const footerExternalNav: readonly NavItem[] = [
  { href: "https://github.com/opencdd", label: "GitHub ↗", external: true },
  { href: "https://cdd.iec.ch", label: "IEC CDD (cdd.iec.ch) ↗", external: true },
  { href: "https://webstore.iec.ch/", label: "IEC webstore ↗", external: true },
] as const;

/**
 * Returns true if `pathname` is the active page for `item`.
 * The "/" item is active only on the homepage; other items are
 * active on prefix matches.
 */
export function navItemIsActive(
  item: NavItem,
  pathname: string,
): boolean {
  if (item.href === "/") return pathname === "/" || pathname === "";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
