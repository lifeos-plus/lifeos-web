import { describe, expect, it } from "vitest";

import {
  createCalendarAdapter,
  GregorianCalendarAdapter,
  MayanCalendarAdapter,
  normalizeMayanNewYearStart,
  parseMayanNewYearStart,
  resolvePlanningCycleStart,
} from "@/utils/calendar";

describe("createCalendarAdapter", () => {
  it("creates Gregorian adapter by default", () => {
    const adapter = createCalendarAdapter("gregorian", 1);
    expect(adapter).toBeInstanceOf(GregorianCalendarAdapter);
  });

  it("creates Mayan adapter when requested", () => {
    const adapter = createCalendarAdapter("mayan_13_moon", 1);
    expect(adapter).toBeInstanceOf(MayanCalendarAdapter);
  });

  it("throws for unsupported calendar systems", () => {
    expect(() => createCalendarAdapter("martian" as never, 1)).toThrowError(
      /Unsupported calendar system/,
    );
  });

  it("normalizes February 29 new year starts to February 28", () => {
    expect(parseMayanNewYearStart("02-29")).toEqual([2, 28]);
    expect(parseMayanNewYearStart("07-26")).toEqual([7, 26]);
    expect(normalizeMayanNewYearStart("02-29")).toBe("02-28");
    expect(normalizeMayanNewYearStart("07-26")).toBe("07-26");
    expect(normalizeMayanNewYearStart("13-01")).toBe("07-26");
  });

  it("resolves the configured seven-year period start for a stored task date", () => {
    const adapter = new MayanCalendarAdapter(1, 1984, "10-05");

    expect(resolvePlanningCycleStart("7years", "2026-07-26", adapter)).toBe(
      "2019-10-05",
    );
    expect(resolvePlanningCycleStart("day", "2026-07-26", adapter)).toBe(
      "2026-07-26",
    );
  });
});
