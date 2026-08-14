#!/usr/bin/env node
/**
 * Fetch the pinned LifeOS Web API OpenAPI document from a lifeos-cli release.
 *
 * The lifeos-cli publish workflow attaches `openapi.json` to every v* GitHub
 * Release. This script downloads that asset so the frontend can regenerate its
 * TypeScript contract from the pinned transport schema.
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DEFAULT_SCHEMA_VERSION = "v1.1.1";

function schemaReleaseUrl(version) {
  return `https://github.com/lifeos-plus/lifeos-cli/releases/download/${version}/openapi.json`;
}

const schemaVersion =
  process.env.LIFEOS_CLI_SCHEMA_VERSION ?? DEFAULT_SCHEMA_VERSION;
const outputPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "openapi.json",
);

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

await writeFile(outputPath, await response.text(), "utf8");
console.log(`Fetched LifeOS Web API schema (${schemaVersion}) -> openapi.json`);
