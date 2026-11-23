import { describe, expect, it } from "vitest";

import en from "@/locales/en/common.json";
import zh from "@/locales/zh/common.json";
import {
  DEFAULT_AVAILABLE_THEMES,
  RENDERABLE_THEMES,
  includeCurrentTheme,
  isAppTheme,
  isRenderableTheme,
  resolveAvailableThemes,
  type AppTheme,
} from "@/theme";

// The bundle/CSS boundary is checked by scripts/check-theme-catalog.mjs.
describe("theme catalog", () => {
  it("keeps theme names unique", () => {
    expect(new Set(RENDERABLE_THEMES).size).toBe(RENDERABLE_THEMES.length);
  });

  it("has labels for every available theme in each locale", () => {
    const expected = ["system", ...RENDERABLE_THEMES].sort();
    expect(Object.keys(en.theme).sort()).toEqual(expected);
    expect(Object.keys(zh.theme).sort()).toEqual(expected);
  });
});

describe("resolveAvailableThemes", () => {
  it("returns every renderable theme when the contract is absent", () => {
    expect(resolveAvailableThemes()).toEqual(DEFAULT_AVAILABLE_THEMES);
    expect(resolveAvailableThemes([])).toEqual(DEFAULT_AVAILABLE_THEMES);
  });

  it("follows the bundle order and drops unknown values", () => {
    expect(resolveAvailableThemes(["night", "unknown-theme", "fresh"])).toEqual([
      "system",
      "fresh",
      "night",
    ]);
  });

  it("deduplicates repeated values", () => {
    expect(resolveAvailableThemes(["night", "night", "fresh"])).toEqual([
      "system",
      "fresh",
      "night",
    ]);
  });

  it("falls back when the contract only contains unusable values", () => {
    expect(resolveAvailableThemes(["not-a-theme", 42, null])).toEqual(
      DEFAULT_AVAILABLE_THEMES,
    );
  });
});

describe("includeCurrentTheme", () => {
  it("keeps the current theme selectable when the contract drops it", () => {
    expect(includeCurrentTheme(["system", "fresh"], "night")).toEqual([
      "system",
      "fresh",
      "night",
    ]);
  });

  it("leaves already listed or system themes untouched", () => {
    const themes: AppTheme[] = ["system", "fresh"];
    expect(includeCurrentTheme(themes, "fresh")).toBe(themes);
    expect(includeCurrentTheme(themes, "system")).toBe(themes);
  });
});

describe("theme guards", () => {
  it("accepts system and renderable themes", () => {
    expect(isAppTheme("system")).toBe(true);
    expect(isAppTheme("night")).toBe(true);
  });

  it("rejects unknown themes", () => {
    expect(isAppTheme("nope")).toBe(false);
    expect(isAppTheme(null)).toBe(false);
    expect(isRenderableTheme("system")).toBe(false);
    expect(isRenderableTheme("nope")).toBe(false);
  });
});
