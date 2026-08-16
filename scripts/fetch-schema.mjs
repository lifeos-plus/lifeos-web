#!/usr/bin/env node
/**
 * Fetch the pinned LifeOS Web API OpenAPI document from a lifeos-cli release.
 *
 * The lifeos-cli publish workflow attaches `openapi.json` to every v* GitHub
 * Release. This script downloads the asset for the version pinned in
 * `scripts/pinned-cli-version.mjs` (override with LIFEOS_CLI_SCHEMA_VERSION)
 * and writes it verbatim; `npm run api:generate` then regenerates the
 * TypeScript contract from the committed document.
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { resolveSchemaVersion } from "./pinned-cli-version.mjs";

const outputPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "openapi.json",
);

function schemaReleaseUrl(version) {
  return `https://github.com/lifeos-plus/lifeos-cli/releases/download/${version}/openapi.json`;
}

const schemaVersion = resolveSchemaVersion();

const response = await fetch(schemaReleaseUrl(schemaVersion));
if (!response.ok) {
  console.error(
    `Failed to download LifeOS Web API schema for version ${schemaVersion}: ` +
      `${response.status} ${response.statusText}`,
  );
  console.error(
    "The lifeos-cli release must publish openapi.json as a release asset. " +
      "Before the first pinned release exists, refresh openapi.json manually " +
      "from a lifeos-cli checkout: uv run --extra web python " +
      "scripts/export_web_openapi.py --output ../lifeos-web/openapi.json",
  );
  process.exit(1);
}

await writeFile(outputPath, await response.text());
console.log(`Fetched LifeOS Web API schema (${schemaVersion}) -> openapi.json`);
