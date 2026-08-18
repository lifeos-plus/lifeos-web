import { describe, expect, it } from "vitest";

import {
  DEFAULT_AREA_COLOR,
  getReadableTextColor,
  resolveEventAreaColor,
  UNKNOWN_AREA_COLOR,
} from "@/utils/areaColors";

const areaMap = new Map([
  ["area-a", { name: "Area A", color: "#123456" }],
]);

describe("getReadableTextColor", () => {
  it("uses dark text on light area colors", () => {
    expect(getReadableTextColor("#F59E0B")).toBe("#111827");
  });

  it("uses light text on dark area colors", () => {
    expect(getReadableTextColor("#1E3A8A")).toBe("#FFFFFF");
  });

  it("falls back to dark text for invalid colors", () => {
    expect(getReadableTextColor("not-a-color")).toBe("#111827");
  });
});

describe("resolveEventAreaColor", () => {
  it("returns null when the event has no area", () => {
    expect(resolveEventAreaColor(null, areaMap)).toBeNull();
    expect(resolveEventAreaColor(undefined, areaMap)).toBeNull();
  });

  it("uses UNKNOWN_AREA_COLOR for the unknown-area sentinel", () => {
    expect(resolveEventAreaColor("-1", areaMap)).toBe(UNKNOWN_AREA_COLOR);
  });

  it("prefers the API-provided area summary color", () => {
    expect(
      resolveEventAreaColor("area-a", areaMap, "#ABCDEF"),
    ).toBe("#ABCDEF");
  });

  it("falls back to the area map color", () => {
    expect(resolveEventAreaColor("area-a", areaMap)).toBe("#123456");
  });

  it("falls back to DEFAULT_AREA_COLOR for unknown area ids", () => {
    expect(resolveEventAreaColor("area-missing", areaMap)).toBe(
      DEFAULT_AREA_COLOR,
    );
  });
});
