#!/usr/bin/env node
/**
 * Enforce coverage on the lines added by the current change set.
 *
 * Aggregate coverage percentages cannot catch a PR that adds hundreds of
 * untested lines while the overall number barely moves. This script closes
 * that gap: it intersects the lines added by `git diff` (since the merge base)
 * with the lcov report produced by `npm run test:coverage` and fails when the
 * share of covered added lines is below the threshold.
 *
 * Usage:
 *   node scripts/check-diff-coverage.mjs [--threshold 70] [--base origin/main]
 *
 * Env overrides:
 *   DIFF_COVERAGE_THRESHOLD  minimum diff coverage percentage (default 70)
 *   DIFF_BASE                git ref to diff against (default origin/main)
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_THRESHOLD = 70;
const DEFAULT_BASE = "origin/main";
const LCOV_PATH = path.join(process.cwd(), "coverage", "lcov.info");

function resolveThreshold() {
  const argIndex = process.argv.indexOf("--threshold");
  const argValue =
    argIndex !== -1 ? Number(process.argv[argIndex + 1]) : Number.NaN;
  const envValue = Number(process.env.DIFF_COVERAGE_THRESHOLD);
  const value = Number.isFinite(argValue)
    ? argValue
    : Number.isFinite(envValue)
      ? envValue
      : DEFAULT_THRESHOLD;
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`Invalid diff coverage threshold: ${value}`);
  }
  return value;
}

function resolveBase() {
  const argIndex = process.argv.indexOf("--base");
  const argValue =
    argIndex !== -1 ? process.argv[argIndex + 1] : undefined;
  return argValue ?? process.env.DIFF_BASE ?? DEFAULT_BASE;
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ` +
        (result.stderr.trim() || result.stdout.trim()),
    );
  }
  return result.stdout;
}

function mergeBase(ref) {
  const result = spawnSync("git", ["merge-base", ref, "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `Could not resolve the merge base against "${ref}". ` +
        "Fetch the base ref first (for example `git fetch origin main`) or " +
        "pass --base / DIFF_BASE.",
    );
  }
  return result.stdout.trim();
}

function addedLinesPerFile(base) {
  const diff = git([
    "diff",
    "--unified=0",
    "--no-color",
    base,
    "--",
    "src",
  ]);
  const files = new Map();
  let currentFile = null;
  let nextLine = 0;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      if (!files.has(currentFile)) {
        files.set(currentFile, new Set());
      }
    } else if (line.startsWith("@@ ")) {
      const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      nextLine = match ? Number(match[1]) : 0;
    } else if (line.startsWith("+") && !line.startsWith("+++") && currentFile) {
      files.get(currentFile).add(nextLine);
      nextLine += 1;
    }
  }
  // Untracked source files are invisible to `git diff`; count every line as
  // added so local runs enforce coverage on new files before they are staged.
  const untracked = git([
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    "src",
  ])
    .split("\n")
    .filter(Boolean);
  for (const file of untracked) {
    if (!files.has(file)) {
      files.set(file, new Set());
    }
    const content = readFileSync(path.join(process.cwd(), file), "utf8");
    const normalized = content.endsWith("\n") ? content.slice(0, -1) : content;
    const lines = normalized.split("\n");
    for (let lineNo = 1; lineNo <= lines.length; lineNo += 1) {
      files.get(file).add(lineNo);
    }
  }
  return files;
}

function normalizePath(filePath) {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  return path
    .relative(process.cwd(), absolute)
    .split(path.sep)
    .join("/");
}

async function parseLcov() {
  const files = new Map();
  const raw = await readFile(LCOV_PATH, "utf8");
  let currentFile = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("SF:")) {
      currentFile = normalizePath(line.slice(3));
      files.set(currentFile, new Map());
    } else if (line.startsWith("DA:") && currentFile) {
      const [lineNumber, count] = line.slice(3).split(",");
      const lineNo = Number(lineNumber);
      const hits = Number.isFinite(Number(count)) ? Number(count) : 0;
      if (!Number.isInteger(lineNo)) continue;
      const hitsByLine = files.get(currentFile);
      hitsByLine.set(lineNo, Math.max(hitsByLine.get(lineNo) ?? 0, hits));
    } else if (line === "end_of_record") {
      currentFile = null;
    }
  }
  return files;
}

const threshold = resolveThreshold();
const base = resolveBase();
const baseCommit = mergeBase(base);
const added = addedLinesPerFile(baseCommit);
const coverage = await parseLcov();

const rows = [];
let addedTotal = 0;
let coveredTotal = 0;
for (const [file, lines] of added) {
  if (!file.startsWith("src/") || lines.size === 0) continue;
  const fileCoverage = coverage.get(file);
  if (!fileCoverage) {
    rows.push({
      file,
      added: lines.size,
      covered: null,
      pct: null,
      skipReason: "not in coverage report",
    });
    continue;
  }
  // Only lines that exist in the lcov report are executable; braces, blank
  // lines, and comments are not part of the coverage denominator.
  const executableAdded = [...lines].filter((lineNo) =>
    fileCoverage.has(lineNo),
  );
  if (executableAdded.length === 0) {
    rows.push({
      file,
      added: lines.size,
      covered: null,
      pct: null,
      skipReason: "no executable added lines",
    });
    continue;
  }
  let covered = 0;
  for (const lineNo of executableAdded) {
    if ((fileCoverage.get(lineNo) ?? 0) > 0) covered += 1;
  }
  addedTotal += executableAdded.length;
  coveredTotal += covered;
  rows.push({
    file,
    added: executableAdded.length,
    covered,
    pct: (covered / executableAdded.length) * 100,
  });
}

if (addedTotal === 0) {
  console.log("[diff-coverage] no changed source lines; nothing to enforce");
  process.exit(0);
}

const overall = (coveredTotal / addedTotal) * 100;
console.log("[diff-coverage] enforcing >= " + threshold + "% on added lines");
for (const row of rows) {
  const label =
    row.pct === null
      ? `skipped (${row.skipReason})`
      : row.pct.toFixed(1) + "%";
  console.log(
    `  ${row.covered ?? "-"}/${row.added} ${label.padEnd(28)} ${row.file}`,
  );
}
console.log(`[diff-coverage] overall: ${coveredTotal}/${addedTotal} (${overall.toFixed(1)}%)`);

if (overall < threshold) {
  console.error(
    `[diff-coverage] FAIL: added-line coverage ${overall.toFixed(1)}% is below ` +
      `the ${threshold}% threshold. Add tests for the changed lines.`,
  );
  process.exit(1);
}

console.log("[diff-coverage] PASS");
