import { describe, expect, it } from "vitest";

import {
  formatWeight,
  totalMinutesToHoursMinutes,
} from "@/features/health/utils";

describe("health utils", () => {
  it("formats weight into the requested display unit", () => {
    expect(formatWeight(63.5, "kg")).toBe("63.50 kg");
    expect(formatWeight(63.5, "jin")).toBe("127.00 jin");
    expect(formatWeight(63.5, "lb")).toBe("139.99 lb");
  });

  it("splits total minutes into hours and minutes", () => {
    expect(totalMinutesToHoursMinutes(480)).toEqual({ hours: 8, minutes: 0 });
    expect(totalMinutesToHoursMinutes(545)).toEqual({ hours: 9, minutes: 5 });
  });
});
