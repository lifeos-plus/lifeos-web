import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { setupTranslationMock } from "@test/utils";
import RecurrenceSelector from "@/components/RecurrenceSelector";

const zhTranslator = (
  key: string,
  options?: string | Record<string, unknown>,
) => {
  const opts = typeof options === "object" ? options : undefined;
  const templates: Record<string, string> = {
    "recurrence.previewPrefix": "预览：",
    "recurrence.monthlyOnOrdinal": "每月{{ordinal}}{{weekday}}",
    "recurrence.monthlyNOnOrdinal": "每{{count}}月{{ordinal}}{{weekday}}",
    "recurrence.dailyN": "每{{count}}天",
    "recurrence.weeklyOn": "每周的{{weekdays}}",
    "recurrence.weeklyNOn": "每{{count}}周的{{weekdays}}",
    "recurrence.monthlyOnDay": "每月{{day}}日",
    "recurrence.monthlyNOnDay": "每{{count}}月{{day}}日",
    "recurrence.yearlyN": "每{{count}}年",
    "recurrence.yearly": "每年",
    "recurrence.separator": "、",
  };
  if (key.startsWith("recurrence.weekdayShort.")) {
    const weekdayShort: Record<string, string> = {
      mo: "周一",
      tu: "周二",
      we: "周三",
      th: "周四",
      fr: "周五",
      sa: "周六",
      su: "周日",
    };
    return weekdayShort[key.slice("recurrence.weekdayShort.".length)] ?? key;
  }
  if (key.startsWith("recurrence.occurrence.")) {
    const occurrence: Record<string, string> = {
      "1": "第一个",
      "2": "第二个",
      "3": "第三个",
      "4": "第四个",
      "-1": "最后一个",
    };
    return occurrence[key.slice("recurrence.occurrence.".length)] ?? key;
  }
  const template = templates[key] ?? key;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(opts?.[name] ?? ""),
  );
};

setupTranslationMock({ translator: zhTranslator });

describe("RecurrenceSelector", () => {
  it("parses monthly ordinal weekday rules for edit forms", () => {
    render(
      <RecurrenceSelector
        value="FREQ=MONTHLY;BYDAY=2MO"
        onChange={vi.fn()}
        startDate={new Date("2026-04-13T09:00:00Z")}
      />,
    );

    expect(screen.getByText("预览：每月第二个周一")).toBeInTheDocument();
  });

  it("parses month-day and yearly month rules for edit forms", () => {
    render(
      <RecurrenceSelector
        value="FREQ=YEARLY;BYMONTH=6"
        onChange={vi.fn()}
        startDate={new Date("2026-06-15T09:00:00Z")}
      />,
    );

    expect(screen.getByText("预览：每年")).toBeInTheDocument();
  });

  it.each([
    ["FREQ=DAILY;INTERVAL=2", "预览：每2天"],
    ["FREQ=WEEKLY;BYDAY=MO,WE", "预览：每周的周一、周三"],
    ["FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE", "预览：每2周的周一、周三"],
    ["FREQ=MONTHLY;BYMONTHDAY=15", "预览：每月15日"],
    ["FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=15", "预览：每3月15日"],
    ["FREQ=MONTHLY;INTERVAL=2;BYDAY=2MO", "预览：每2月第二个周一"],
    ["FREQ=YEARLY;INTERVAL=2", "预览：每2年"],
  ])("renders the preview for rrule %s", (rrule, preview) => {
    render(
      <RecurrenceSelector
        value={rrule}
        onChange={vi.fn()}
        startDate={new Date("2026-04-13T09:00:00Z")}
      />,
    );

    expect(screen.getByText(preview)).toBeInTheDocument();
  });
});
