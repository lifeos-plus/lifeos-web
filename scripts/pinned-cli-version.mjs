#!/usr/bin/env node
/**
 * Resolve the lifeos-cli version that must back the pinned OpenAPI contract.
 *
 * Single source of truth for the CLI version used by CI, the E2E harness, and
 * contributor docs: bump the pinned schema version here (or override it via
 * LIFEOS_CLI_SCHEMA_VERSION) and every consumer follows. The printed version
 * drops the leading "v" because PyPI releases use plain semver.
 */

import { pathToFileURL } from "node:url";

export const DEFAULT_SCHEMA_VERSION = "v1.1.1";

export function resolveSchemaVersion() {
  return process.env.LIFEOS_CLI_SCHEMA_VERSION ?? DEFAULT_SCHEMA_VERSION;
}

export function pinnedCliVersion() {
  return resolveSchemaVersion().replace(/^v/, "");
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  console.log(pinnedCliVersion());
}
