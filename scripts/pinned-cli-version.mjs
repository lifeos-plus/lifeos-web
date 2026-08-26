#!/usr/bin/env node
/**
 * Resolve the lifeos-cli version that backs the pinned OpenAPI contract.
 *
 * The web repository owns this pin explicitly: bump DEFAULT_SCHEMA_VERSION (or
 * pass LIFEOS_CLI_SCHEMA_VERSION) when consuming a newer lifeos-cli release.
 * CI, the E2E harness, and contributor docs all derive the version from this
 * single constant, so there is exactly one place to update.
 */

import { pathToFileURL } from "node:url";

export const DEFAULT_SCHEMA_VERSION = "v1.3.4";
const PEP440_VERSION_PATTERN = /^\d+\.\d+\.\d+[0-9A-Za-z.+-]*$/;

export function resolveSchemaVersion() {
  return process.env.LIFEOS_CLI_SCHEMA_VERSION ?? DEFAULT_SCHEMA_VERSION;
}

export function pinnedCliVersion() {
  const version = resolveSchemaVersion().replace(/^v/, "");
  if (!PEP440_VERSION_PATTERN.test(version)) {
    throw new Error(
      `Invalid lifeos-cli version derived from the schema pin: "${version}". ` +
        "Expected a numeric PEP 440 version (major.minor.patch).",
    );
  }
  return version;
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  console.log(pinnedCliVersion());
}
