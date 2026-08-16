#!/usr/bin/env node
/**
 * Fetch the pinned LifeOS Web API OpenAPI document from a lifeos-cli release.
 *
 * The lifeos-cli publish workflow attaches `openapi.json` to every v* GitHub
 * Release. This script downloads that asset so the frontend can regenerate its
 * TypeScript contract from the pinned transport schema.
 *
 * The downloaded document is made self-describing: `info["x-lifeos-cli-release"]`
 * records the GitHub release tag it came from, so consumers (CI, the E2E
 * harness, contributor docs) derive the matching lifeos-cli version from the
 * committed artifact instead of maintaining a separate constant. The field is
 * injected only as a fallback: when the release asset already carries it
 * (lifeos-cli emits it during export), the asset's own value is trusted.
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RELEASE_PROVENANCE_KEY = "x-lifeos-cli-release";
const outputPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "openapi.json",
);

function schemaReleaseUrl(version) {
  return `https://github.com/lifeos-plus/lifeos-cli/releases/download/${version}/openapi.json`;
}

async function latestReleaseTag() {
  const response = await fetch(
    "https://api.github.com/repos/lifeos-plus/lifeos-cli/releases/latest",
    { headers: { Accept: "application/vnd.github+json", "User-Agent": "lifeos-web" } },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to resolve the latest lifeos-cli release: ` +
        `${response.status} ${response.statusText}`,
    );
  }
  const release = await response.json();
  return release.tag_name;
}

function injectReleaseProvenance(raw, tag) {
  const existingKeyPattern =
    /^(\s*)"x-lifeos-cli-release": "[^"]*",?$/m;
  if (existingKeyPattern.test(raw)) {
    // The lifeos-cli release already records its provenance; keep it as-is.
    return raw;
  }
  const descriptionAnchor =
    '"description": "Local-first Web API for lifeos-cli data.",';
  if (raw.includes(descriptionAnchor)) {
    return raw.replace(
      descriptionAnchor,
      `${descriptionAnchor}\n    "x-lifeos-cli-release": "${tag}",`,
    );
  }
  // Fallback: structural rewrite, kept for future info-block changes.
  const document = JSON.parse(raw);
  document.info = { ...document.info, [RELEASE_PROVENANCE_KEY]: tag };
  return `${JSON.stringify(document, null, 2)}\n`;
}

const schemaVersion =
  process.env.LIFEOS_CLI_SCHEMA_VERSION ?? (await latestReleaseTag());

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

const raw = await response.text();
await writeFile(outputPath, injectReleaseProvenance(raw, schemaVersion));
console.log(`Fetched LifeOS Web API schema (${schemaVersion}) -> openapi.json`);
