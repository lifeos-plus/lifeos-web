#!/usr/bin/env node
/**
 * Resolve the lifeos-cli version that must back the pinned OpenAPI contract.
 *
 * The pinned `openapi.json` is self-describing: `info["x-lifeos-cli-release"]`
 * records the GitHub release tag the document was fetched from. This module is
 * the single reader of that provenance, and CI, the E2E harness, and
 * contributor docs all derive the CLI version from it. No version number is
 * stored in documentation or duplicated in other scripts.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const RELEASE_PROVENANCE_KEY = "x-lifeos-cli-release";
const PEP440_VERSION_PATTERN = /^\d+\.\d+\.\d+[0-9A-Za-z.+-]*$/;

export async function pinnedCliVersion() {
  const openApiPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "openapi.json",
  );
  const document = JSON.parse(await readFile(openApiPath, "utf8"));
  const releaseTag = document.info?.[RELEASE_PROVENANCE_KEY];
  if (typeof releaseTag !== "string" || releaseTag === "") {
    throw new Error(
      `openapi.json does not record its lifeos-cli release ` +
        `(missing info.${RELEASE_PROVENANCE_KEY}). Run ` +
        "`npm run api:refresh` to pin a self-describing contract.",
    );
  }
  const version = releaseTag.replace(/^v/, "");
  if (!PEP440_VERSION_PATTERN.test(version)) {
    throw new Error(
      `Invalid lifeos-cli version recorded in openapi.json: "${releaseTag}". ` +
        "Expected a numeric PEP 440 version (major.minor.patch).",
    );
  }
  return version;
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  console.log(await pinnedCliVersion());
}
