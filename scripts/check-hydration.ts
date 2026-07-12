#!/usr/bin/env tsx
/**
 * Hydration + dark-mode check — runs Playwright against a preview
 * server, loads every key route in BOTH light and dark modes, and
 * reports:
 *   - any "Hydration completed but contains mismatches" errors
 *   - any other console errors
 *   - whether the rendered page has light-mode-only surfaces (white
 *     backgrounds) in dark mode
 *
 * Usage:
 *   npx tsx scripts/check-hydration.ts
 */

import { chromium } from "playwright";

const PREVIEW_PORT = 4325;
const BASE = `http://localhost:${PREVIEW_PORT}`;

interface RouteResult {
  url: string;
  mode: "light" | "dark";
  errors: string[];
  warnings: string[];
  hydrationMismatches: number;
  status: number;
  whiteSurfaceCount: number;
}

async function checkRoute(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  path: string,
  mode: "light" | "dark",
): Promise<RouteResult> {
  const context = await browser.newContext({
    colorScheme: mode,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  const warnings: string[] = [];
  let hydrationMismatches = 0;

  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (text.includes("Hydration completed but contains mismatches")) {
      hydrationMismatches++;
    }
    if (type === "error") errors.push(text);
    if (type === "warning") warnings.push(text);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

  const url = `${BASE}${path}`;
  const response = await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // In dark mode, check for hard-coded white surfaces (a sign that a
  // component isn't using the design tokens).
  let whiteSurfaceCount = 0;
  if (mode === "dark") {
    whiteSurfaceCount = await page.evaluate(() => {
      // Look for visible elements whose computed background is close to pure white
      // (#fff / #ffffff / rgb(255,255,255)) — these bypass dark-mode tokens.
      const all = Array.from(document.querySelectorAll<HTMLElement>("*"));
      let count = 0;
      for (const el of all) {
        const bg = window.getComputedStyle(el).backgroundColor;
        const m = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!m) continue;
        const [, r, g, b] = m;
        if (r === "255" && g === "255" && b === "255") {
          // Skip tiny / invisible elements
          const rect = el.getBoundingClientRect();
          if (rect.width < 10 || rect.height < 10) continue;
          // Skip elements that are themselves inside something dark
          // (e.g. text inside a button).
          count++;
        }
      }
      return count;
    });
  }

  await context.close();
  return {
    url: path,
    mode,
    errors,
    warnings,
    hydrationMismatches,
    status: response?.status() ?? 0,
    whiteSurfaceCount,
  };
}

async function main() {
  console.log("[check-hydration] launching chromium");
  const browser = await chromium.launch({ headless: true });

  const routes = [
    "/",
    "/about/",
    "/docs/",
    "/docs/getting-started/",
    "/blog/",
    "/blog/introducing-opencdd/",
    "/d/iec61360/",
    "/d/iec61360/about/",
    "/d/iec61360/c/AAA021/",
    "/d/iec61360/p/AAD009/",
    "/d/iec63508/c/KDA001/",
    "/search",
  ];

  let totalMismatches = 0;
  let totalErrors = 0;
  let totalWhiteSurfaces = 0;
  for (const route of routes) {
    for (const mode of ["light", "dark"] as const) {
      const result = await checkRoute(browser, route, mode);
      totalMismatches += result.hydrationMismatches;
      totalErrors += result.errors.length;
      totalWhiteSurfaces += result.whiteSurfaceCount;
      const tag = result.hydrationMismatches > 0
        ? "MISMATCH"
        : result.errors.length > 0
          ? "ERRORS"
          : result.whiteSurfaceCount > 0
            ? "WHITE"
            : "ok";
      console.log(
        `[${tag}] ${result.status} ${mode.padEnd(5)} ${route} — ${result.hydrationMismatches} hydration, ${result.errors.length} errors, ${result.whiteSurfaceCount} white-surfaces`,
      );
      for (const err of result.errors.slice(0, 2)) {
        console.log(`    error: ${err.slice(0, 200)}`);
      }
    }
  }

  await browser.close();
  console.log(
    `\n[check-hydration] total: ${totalMismatches} hydration mismatches, ${totalErrors} errors, ${totalWhiteSurfaces} white-surfaces in dark mode across ${routes.length * 2} route-visits`,
  );
  process.exit(
    totalMismatches > 0 || totalErrors > 0 || totalWhiteSurfaces > 0 ? 1 : 0,
  );
}

main().catch((err) => {
  console.error("[check-hydration] fatal:", err);
  process.exit(1);
});

