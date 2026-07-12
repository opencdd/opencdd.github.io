#!/usr/bin/env tsx
/**
 * Audit Astro/MDX files for JSX whitespace bugs.
 *
 * In JSX (and Astro), when a line of text is immediately followed by a
 * line starting with `<Element>` or `{expression}`, the newline between
 * them collapses and the rendered output loses the space. Example:
 *
 *   <p>open a PR against
 *     <code>src/content/blog/</code>
 *   </p>
 *
 * renders as "open a PR againstsrc/content/blog/".
 *
 * The fix is one of:
 *   <p>open a PR against <code>...</code></p>          (single line)
 *   <p>open a PR against{" "}<code>...</code></p>      (explicit space)
 *
 * This script flags suspicious line pairs so they can be reviewed and
 * fixed. It does not edit files automatically — the patterns have false
 * positives (e.g. inside <pre>, <code>, fenced code blocks, or
 * frontmatter) and a human should decide.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

interface Finding {
  file: string;
  line: number; // 1-based line number of the SECOND line (the tag/expression)
  prevLine: string;
  currLine: string;
  prevLineNo: number;
}

function listAstroAndMdxFiles(): string[] {
  const out = execSync("git ls-files 'src/**/*.astro' 'src/**/*.mdx'", {
    encoding: "utf8",
    cwd: repoRoot,
  });
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .sort();
}

// Heuristic: does a line "end with text" — i.e. its last non-whitespace
// char is alphanumeric, a closing paren, or punctuation that would
// normally be followed by whitespace?
function endsWithText(line: string): boolean {
  const trimmed = line.replace(/\s+$/, "");
  if (trimmed.length === 0) return false;
  const lastChar = trimmed[trimmed.length - 1];
  // Letters, digits, sentence-ending punctuation, closing quotes/parens.
  return /[A-Za-z0-9).\]}"'!?,;:]/.test(lastChar);
}

// Heuristic: does this line "start with an OPENING tag or a fresh
// expression"? Closing tags (</a>, </span>) don't introduce new
// content, so "text\n</a>" is fine — the </a> closes the parent of
// "text" and there's no adjacent-rendering issue.
//
// We only flag inline tags (a, code, em, strong, span, kbd, …) —
// block tags (div, p, ul, …) are usually layout containers, not
// inline-rendering neighbours.
const INLINE_TAGS = new Set([
  "a", "code", "em", "strong", "span", "kbd", "sub", "sup",
  "b", "i", "mark", "small", "abbr", "cite", "label", "q",
]);

function startsWithInlineOpeningTag(line: string): boolean {
  const trimmed = line.replace(/^\s+/, "");
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
    return false;
  }
  if (trimmed.startsWith("<!--")) return false;
  // Opening tag: <Letter... (NOT </ for closing tags, NOT <! for doctype).
  // Allow tag name to end with `>`, `/`, whitespace, OR end-of-line
  // (the tag's attributes may follow on subsequent lines).
  const m = /^<([a-zA-Z][a-zA-Z0-9]*)/.exec(trimmed);
  if (!m) return false;
  if (trimmed.startsWith("</")) return false;
  const tag = m[1];
  return INLINE_TAGS.has(tag);
}

// Was an explicit space already inserted?
function hasExplicitSpace(prevLine: string, currLine: string): boolean {
  return /\{"\s*"\}\s*$/.test(prevLine) || /^\s*\{"\s*"\}/.test(currLine);
}

// Are we inside a frontmatter block (---/---)?  Walks the file with a
// simple state machine and returns the 1-based line numbers where
// frontmatter starts and ends, inclusive.
function frontmatterRange(lines: string[]): { start: number; end: number } | null {
  if (lines.length === 0 || lines[0].trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return { start: 0, end: i };
  }
  return null;
}

// Are we inside a fenced code block (```...```)?  Returns ranges.
function codeBlockRanges(lines: string[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let inBlock = false;
  let blockStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const isFence = /^```/.test(trimmed) || /^~~~/.test(trimmed);
    if (isFence) {
      if (!inBlock) {
        inBlock = true;
        blockStart = i;
      } else {
        ranges.push([blockStart, i]);
        inBlock = false;
      }
    }
  }
  return ranges;
}

// Are we inside a <pre>...</pre> block?  Returns ranges (line-based).
function preBlockRanges(lines: string[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let inPre = false;
  let preStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!inPre && /<pre(\s|>)/i.test(trimmed)) {
      inPre = true;
      preStart = i;
    } else if (inPre && /<\/pre>/i.test(trimmed)) {
      ranges.push([preStart, i]);
      inPre = false;
    }
  }
  return ranges;
}

function inRange(
  lineNo: number,
  ranges: Array<[number, number]>,
): boolean {
  return ranges.some(([start, end]) => lineNo >= start && lineNo <= end);
}

function auditFile(file: string): Finding[] {
  const abs = resolve(repoRoot, file);
  const content = readFileSync(abs, "utf8");
  const lines = content.split("\n");
  const findings: Finding[] = [];

  const fm = frontmatterRange(lines);
  const codeBlocks = codeBlockRanges(lines);
  const preBlocks = preBlockRanges(lines);

  for (let i = 1; i < lines.length; i++) {
    const prevLine = lines[i - 1];
    const currLine = lines[i];

    // Skip frontmatter.
    if (fm && i >= fm.start && i <= fm.end) continue;

    // Skip fenced code blocks.
    if (inRange(i, codeBlocks) || inRange(i - 1, codeBlocks)) continue;

    // Skip <pre> blocks.
    if (inRange(i, preBlocks) || inRange(i - 1, preBlocks)) continue;

    if (!endsWithText(prevLine)) continue;
    if (!startsWithInlineOpeningTag(currLine)) continue;
    if (hasExplicitSpace(prevLine, currLine)) continue;

    findings.push({
      file,
      line: i + 1,
      prevLineNo: i,
      prevLine: prevLine.trim(),
      currLine: currLine.trim(),
    });
  }

  return findings;
}

function main(): void {
  const files = listAstroAndMdxFiles();
  let total = 0;
  for (const file of files) {
    const findings = auditFile(file);
    if (findings.length === 0) continue;
    for (const f of findings) {
      const rel = relative(repoRoot, resolve(repoRoot, f.file));
      console.log(`\n${rel}:${f.line}`);
      console.log(`  ${f.prevLineNo}:  …${f.prevLine.slice(-60)}`);
      console.log(`  ${f.line}:  ${f.currLine.slice(0, 60)}…`);
      total++;
    }
  }
  console.log(`\n${total === 0 ? "No JSX whitespace issues found." : `${total} potential issue(s) — review and add {" "} or reflow.`}`);
  process.exit(total === 0 ? 0 : 1);
}

main();
