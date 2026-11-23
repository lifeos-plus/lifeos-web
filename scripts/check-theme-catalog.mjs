#!/usr/bin/env node
/**
 * Keep the renderable theme list in sync with the CSS bundle.
 *
 * `src/theme.ts` declares which themes this app can style; `src/index.css`
 * declares which themes daisyUI actually compiles. If they drift apart the
 * theme picker offers themes without styles (or hides themes that exist).
 *
 * The API contract owns which themes a user may select
 * (`preferences/appearance.theme?meta=true` → `meta.allowed_values`), so this
 * script only guards the local presentation boundary.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const themeSourcePath = path.join(root, "src", "theme.ts");
const indexCssPath = path.join(root, "src", "index.css");

function fail(message) {
  console.error(`[theme-catalog] ${message}`);
  process.exit(1);
}

function declaredThemesInTypeScript(source) {
  const match = source.match(/export const RENDERABLE_THEMES = \[([\s\S]*?)\] as const;/);
  if (!match) {
    fail("RENDERABLE_THEMES not found in src/theme.ts");
  }
  return [...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]);
}

function declaredThemesInCss(source) {
  const match = source.match(/themes:\s*([^;]+);/);
  if (!match) {
    fail("daisyUI theme list not found in src/index.css");
  }
  return match[1]
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean);
}

const fromTypeScript = declaredThemesInTypeScript(
  readFileSync(themeSourcePath, "utf8"),
);
const fromCss = declaredThemesInCss(readFileSync(indexCssPath, "utf8"));

if (new Set(fromTypeScript).size !== fromTypeScript.length) {
  fail("RENDERABLE_THEMES contains duplicate entries");
}

if (fromTypeScript.join(",") !== fromCss.join(",")) {
  const missingInTs = fromCss.filter((theme) => !fromTypeScript.includes(theme));
  const missingInCss = fromTypeScript.filter((theme) => !fromCss.includes(theme));
  fail(
    [
      "src/theme.ts RENDERABLE_THEMES does not match src/index.css daisyUI themes.",
      missingInTs.length ? `  missing in theme.ts: ${missingInTs.join(", ")}` : "",
      missingInCss.length
        ? `  missing in index.css: ${missingInCss.join(", ")}`
        : "",
      "  Fix: update src/index.css `themes:` and src/theme.ts together.",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

console.log(`[theme-catalog] ${fromTypeScript.length} themes in sync.`);
