#!/usr/bin/env node
/**
 * Guard the security override that keeps `@tailwindcss/typography` on a
 * patched `postcss-selector-parser`.
 *
 * `@tailwindcss/typography@0.5.20` still pins `postcss-selector-parser@6.0.10`,
 * which is affected by GHSA-rj75-hqrm-r3gf (CVE-2026-104844). The scoped
 * override moves that single parent to the patched 7.x line.
 *
 * This check fails validation when:
 *   - the override is missing while the parent still pins a vulnerable parser,
 *   - the locked parser drops below the lowest patched release, or
 *   - the override became redundant because the parent now depends on a
 *     patched parser directly (remove the override and this guard entry).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(webRoot, "package.json"), "utf8"),
);
const lock = JSON.parse(
  fs.readFileSync(path.join(webRoot, "package-lock.json"), "utf8"),
);

const PARENT = "@tailwindcss/typography";
const PARSER = "postcss-selector-parser";
// 7.1.6 fixes GHSA-rj75-hqrm-r3gf; 7.1.8 adds the linear-time parsing
// hardening. 6.1.6 is the backported 6.x patch release.
const MIN_PATCHED = {
  6: [6, 1, 6],
  7: [7, 1, 8],
};

function parseVersion(version) {
  const [major = 0, minor = 0, patch = 0] = version
    .split("-")[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10));
  return [major, minor, patch];
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

/** Return the lowest version a dependency spec can resolve to, or null. */
function specFloor(spec) {
  const match = /^(?:\^|~|>=|=|>)?\s*v?(\d+)\.(\d+)\.(\d+)/.exec(spec.trim());
  return match ? match.slice(1, 4).map((part) => Number.parseInt(part, 10)) : null;
}

function isPatched(version) {
  const minimum = MIN_PATCHED[version[0]];
  return minimum ? compareVersions(version, minimum) >= 0 : version[0] > 7;
}

function fail(message) {
  console.error(`[overrides] ${message}`);
  process.exit(1);
}

const parentEntry = lock.packages?.[`node_modules/${PARENT}`];
const parentSpec = parentEntry?.dependencies?.[PARSER] ?? null;
const lockedVersion = lock.packages?.[`node_modules/${PARSER}`]?.version ?? null;
const overrideSpec = manifest.overrides?.[PARENT]?.[PARSER] ?? null;

if (!parentSpec) {
  console.log(`[overrides] ${PARENT} does not depend on ${PARSER}; nothing to guard.`);
  process.exit(0);
}

const parentFloor = specFloor(parentSpec);
const parentNeedsOverride = parentFloor === null || !isPatched(parentFloor);

if (!overrideSpec) {
  if (parentNeedsOverride) {
    fail(
      `${PARENT} pins ${PARSER}@${parentSpec}, which resolves below the patched ` +
        "line (GHSA-rj75-hqrm-r3gf). Restore the scoped override in package.json.",
    );
  }
  console.log(
    `[overrides] ${PARENT} now depends on a patched ${PARSER} (${parentSpec}); ` +
      "the override is no longer needed.",
  );
  process.exit(0);
}

if (!lockedVersion) {
  fail(`${PARSER} is not present in package-lock.json; run npm install.`);
}

const locked = parseVersion(lockedVersion);
if (!isPatched(locked)) {
  fail(
    `locked ${PARSER}@${lockedVersion} is below the patched line ` +
      "(GHSA-rj75-hqrm-r3gf / linear-time parsing). Update the override and lockfile.",
  );
}

if (!parentNeedsOverride) {
  fail(
    `${PARENT}@${parentEntry.version} already depends on a patched ${PARSER} ` +
      `(${parentSpec}). Remove the package.json override so updates flow directly.`,
  );
}

console.log(
  `[overrides] ${PARENT}@${parentEntry.version} pins ${PARSER}@${parentSpec}; ` +
    `override ${overrideSpec} resolves to patched ${lockedVersion}.`,
);
