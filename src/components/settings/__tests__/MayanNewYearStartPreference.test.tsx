import { beforeEach, describe, expect, it, vi } from "vitest";

import MayanNewYearStartPreference from "@/components/settings/MayanNewYearStartPreference";
import { render } from "@testing-library/react";
import { setupTranslationMock } from "@test/utils";

const enumSelectProps = vi.hoisted(() => ({} as Record<string, unknown>));

vi.mock("@/components/selects/EnumSelect", () => ({
  default: (props: unknown) => {
    const typed = props as { id: string };
    enumSelectProps[typed.id] = props;
    return <div data-testid={`enum-${typed.id}`} />;
  },
}));

interface EnumSelectPropsLike {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled: boolean;
}

const monthSelect = () =>
  enumSelectProps["mayan-new-year-start-month"] as EnumSelectPropsLike;
const daySelect = () =>
  enumSelectProps["mayan-new-year-start-day"] as EnumSelectPropsLike;

const baseProps = {
  onChange: vi.fn(),
  onSave: vi.fn().mockResolvedValue(true),
  onCommit: vi.fn().mockResolvedValue(true),
  saving: false,
  loading: false,
  disabled: false,
  id: "mayan-new-year-start",
};

describe("MayanNewYearStartPreference", () => {
  beforeEach(() => {
    setupTranslationMock();
  });

  it("shows the current month and day in the selectors", () => {
    render(<MayanNewYearStartPreference {...baseProps} value="07-26" />);

    expect(monthSelect().value).toBe("7");
    expect(daySelect().value).toBe("26");
    expect(monthSelect().options).toHaveLength(12);
    expect(daySelect().options).toHaveLength(31);
  });

  it("commits a month-day when the month or day changes", () => {
    const onCommit = vi.fn().mockResolvedValue(true);
    render(
      <MayanNewYearStartPreference
        {...baseProps}
        value="07-26"
        onCommit={onCommit}
      />,
    );

    monthSelect().onChange("3");
    expect(onCommit).toHaveBeenCalledWith("03-26");

    daySelect().onChange("15");
    expect(onCommit).toHaveBeenCalledWith("07-15");
  });

  it("offers 28 days for February and clamps the day when the month shrinks", () => {
    const onCommit = vi.fn().mockResolvedValue(true);
    render(
      <MayanNewYearStartPreference
        {...baseProps}
        value="01-31"
        onCommit={onCommit}
      />,
    );

    monthSelect().onChange("2");
    expect(onCommit).toHaveBeenCalledWith("02-28");

    render(<MayanNewYearStartPreference {...baseProps} value="02-10" />);
    expect(daySelect().options).toHaveLength(28);
  });

  it("disables the selectors while saving or loading", () => {
    render(
      <MayanNewYearStartPreference
        {...baseProps}
        value="07-26"
        disabled
      />,
    );

    expect(monthSelect().disabled).toBe(true);
    expect(daySelect().disabled).toBe(true);
  });
});
