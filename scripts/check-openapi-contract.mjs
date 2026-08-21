#!/usr/bin/env node
/**
 * Semantic OpenAPI contract drift check.
 *
 * openapi.json is a generated artifact: regenerating it produces a large
 * line-level diff even when only new endpoints are added (schemas are kept
 * alphabetically sorted, so insertions shift the tail of the file). This
 * script replaces the noisy text diff with a precise structural comparison:
 * it reports which paths and component schemas were added, removed, or
 * modified, and fails when an *existing* contract entry changes or
 * disappears.
 *
 * Usage:
 *   node scripts/check-openapi-contract.mjs            # HEAD vs merge-base
 *   node scripts/check-openapi-contract.mjs --base a.json --head b.json
 *
 * Exit codes: 0 = contract preserved (only additions), 1 = drift or error.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

function parseArgs(argv) {
  const args = { base: null, head: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--base") args.base = argv[i + 1];
    else if (argv[i] === "--head") args.head = argv[i + 1];
  }
  return args;
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sortedKeys(obj) {
  return Object.keys(obj).sort();
}

/** Structural fingerprint of one contract entry (order-insensitive). */
function fingerprint(value) {
  return JSON.stringify(value, null, 0);
}

function categorize(prefix, baseMap, headMap) {
  const baseKeys = new Set(Object.keys(baseMap));
  const headKeys = new Set(Object.keys(headMap));
  const added = [];
  const removed = [];
  const modified = [];
  for (const key of sortedKeys(baseMap)) {
    if (!headKeys.has(key)) {
      removed.push(key);
    } else if (fingerprint(baseMap[key]) !== fingerprint(headMap[key])) {
      modified.push(key);
    }
  }
  for (const key of sortedKeys(headMap)) {
    if (!baseKeys.has(key)) {
      added.push(key);
    }
  }
  return { prefix, added, removed, modified };
}

function summarize(section) {
  const { prefix, added, removed, modified } = section;
  const parts = [];
  if (added.length > 0) parts.push(`${added.length} added`);
  if (removed.length > 0) parts.push(`${removed.length} removed`);
  if (modified.length > 0) parts.push(`${modified.length} modified`);
  return `[openapi-contract] ${prefix}: ${parts.join(", ") || "no changes"}`;
}

function main() {
  const { base, head } = parseArgs(process.argv.slice(2));
  let basePath = base;
  let headPath = head;
  if (!basePath || !headPath) {
    // Resolve the merge-base against origin/main, mirroring PR review scope.
    const mergeBase = git(["merge-base", "HEAD", "origin/main"]);
    basePath = `/tmp/openapi-contract-base-${process.pid}.json`;
    headPath = `/tmp/openapi-contract-head-${process.pid}.json`;
    writeFileSync(basePath, git(["show", `${mergeBase}:openapi.json`]));
    writeFileSync(headPath, git(["show", "HEAD:openapi.json"]));
  }

  const baseDoc = loadJson(basePath);
  const headDoc = loadJson(headPath);
  const sections = [
    categorize(
      "paths",
      baseDoc.paths ?? {},
      headDoc.paths ?? {},
    ),
    categorize(
      "schemas",
      baseDoc.components?.schemas ?? {},
      headDoc.components?.schemas ?? {},
    ),
  ];

  for (const section of sections) {
    console.log(summarize(section));
    if (section.added.length > 0) {
      console.log(`  added: ${section.added.join(", ")}`);
    }
  }

  const drift = sections.flatMap((s) => [...s.removed, ...s.modified]);
  if (drift.length > 0) {
    console.error(
      "[openapi-contract] EXISTING contract entries were modified or removed:",
    );
    for (const key of drift) {
      console.error(`  - ${key}`);
    }
    process.exit(1);
  }
  console.log("[openapi-contract] OK: existing contract preserved, additions only.");
}

main();
