/**
 * IRDI display helpers for the browser.
 *
 * An IRDI is either `registrant/semantic///scheme#code` (full) or just
 * `code` (short) — the short code is what's after `#` if there is one,
 * otherwise the whole string.
 */

export function codeFromIrdi(irdi: string): string {
  const hash = irdi.lastIndexOf("#");
  return hash < 0 ? irdi : irdi.slice(hash + 1);
}
