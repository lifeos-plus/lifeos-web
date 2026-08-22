#!/usr/bin/env node
/**
 * Fetch the pinned LifeOS Web API OpenAPI document from a lifeos-cli release.
 *
 * The lifeos-cli publish workflow attaches `openapi.json` to every v* GitHub
 * Release. This script downloads the asset for the version pinned in
 * `scripts/pinned-cli-version.mjs` (override with LIFEOS_CLI_SCHEMA_VERSION)
 * and writes it locally. The document is gitignored: it is a generated
 * artifact whose version-controlled authority is the pin itself. `npm run
 * api:generate` regenerates the TypeScript contract from the fetched
 * document; `npm run api:check` verifies the committed schema.ts is fresh.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { resolveSchemaVersion } from "./pinned-cli-version.mjs";

const PIN_FILE = new URL("./pinned-schema.sha256", import.meta.url);
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

const schemaText = await response.text();
const digest = createHash("sha256").update(schemaText, "utf8").digest("hex");
let pinnedDigest = null;
try {
  const pinText = await readFile(PIN_FILE, "utf8");
  for (const line of pinText.split("\n")) {
    const fields = line.trim().split(/\s+/);
    if (fields.length >= 2 && fields[1] === schemaVersion) {
      pinnedDigest = fields[0];
    }
  }
} catch {
  // A missing pin file is handled below as an integrity failure.
}

if (pinnedDigest === null) {
  console.error(
    `No integrity pin found for ${schemaVersion}. Add its SHA-256 to ` +
      `${fileURLToPath(PIN_FILE)} before refreshing the schema.`,
  );
  process.exit(1);
}
if (digest !== pinnedDigest) {
  console.error(
    `Schema integrity check failed for ${schemaVersion}: ` +
      `expected ${pinnedDigest}, got ${digest}.`,
  );
  process.exit(1);
}

await writeFile(outputPath, schemaText);
console.log(`Fetched LifeOS Web API schema (${schemaVersion}) -> openapi.json`);
console.log(`Schema integrity verified: sha256 ${digest}`);
