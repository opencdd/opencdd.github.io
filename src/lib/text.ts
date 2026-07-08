/**
 * Section slug helper — convert a section title to a URL-safe anchor.
 * "Declared properties" → "declared-properties".
 */

export function sectionSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
