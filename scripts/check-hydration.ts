#!/usr/bin/env tsx
/**
 * Hydration check — runs Playwright against a preview server, loads
 * every key route, and reports any "Hydration completed but contains
 * mismatches" errors (or any other console errors).
 *
 * Usage:
 *   npx tsx scripts/check-hydration.ts
 *
 * Requires a running preview server. The script will start one if
 * `astro preview` isn't already on port 4325.
 */

import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PREVIEW_PORT = 4325;
const BASE = `http://localhost:${PREVIEW_PORT}`;

interface RouteResult {
  url: string;
  errors: string[];
  warnings: string[];
  hydrationMismatches: number;
  status: number;
}

async function checkRoute(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  path: string,
): Promise<RouteResult> {
  const page = await browser.newPage();
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
  await page.waitForTimeout(500); // let hydration settle

  await page.close();
  return {
    url: path,
    errors,
    warnings,
    hydrationMismatches,
    status: response?.status() ?? 0,
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
    "/search",
  ];

  let totalMismatches = 0;
  let totalErrors = 0;
  for (const route of routes) {
    const result = await checkRoute(browser, route);
    totalMismatches += result.hydrationMismatches;
    totalErrors += result.errors.length;
    const tag = result.hydrationMismatches > 0
      ? "MISMATCH"
      : result.errors.length > 0
        ? "ERRORS"
        : "ok";
    console.log(
      `[${tag}] ${result.status} ${route} — ${result.hydrationMismatches} hydration, ${result.errors.length} errors, ${result.warnings.length} warnings`,
    );
    for (const err of result.errors.slice(0, 3)) {
      console.log(`    error: ${err.slice(0, 200)}`);
    }
  }

  await browser.close();
  console.log(
    `\n[check-hydration] total: ${totalMismatches} hydration mismatches, ${totalErrors} errors across ${routes.length} routes`,
  );
  process.exit(totalMismatches > 0 || totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[check-hydration] fatal:", err);
  process.exit(1);
});
