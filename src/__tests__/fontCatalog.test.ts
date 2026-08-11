import { describe, expect, it } from "vitest";

import { AVAILABLE_FONTS } from "@/config/fontCatalog";
import en from "@/locales/en/common.json";
import zh from "@/locales/zh/common.json";

describe("font catalog", () => {
  it("has labels for every available font in each locale", () => {
    expect(Object.keys(en.settings.appearance.font.options)).toEqual(
      AVAILABLE_FONTS,
    );
    expect(Object.keys(zh.settings.appearance.font.options)).toEqual(
      AVAILABLE_FONTS,
    );
  });
});
