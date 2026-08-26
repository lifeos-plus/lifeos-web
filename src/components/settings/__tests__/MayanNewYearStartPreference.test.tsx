import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MayanNewYearStartPreference from "@/components/settings/MayanNewYearStartPreference";
import { renderWithProviders, setupTranslationMock } from "@test/utils";

describe("MayanNewYearStartPreference", () => {
  beforeEach(() => {
    setupTranslationMock();
  });

  const baseProps = {
    onChange: vi.fn(),
    onSave: vi.fn().mockResolvedValue(true),
    saving: false,
    loading: false,
    disabled: false,
    id: "mayan-new-year-start",
  };

  function Harness({
    initialValue,
    disabled = false,
  }: {
    initialValue: string;
    disabled?: boolean;
  }) {
    const [value, setValue] = useState(initialValue);
    return (
      <MayanNewYearStartPreference
        {...baseProps}
        value={value}
        disabled={disabled}
        onCommit={async (nextValue) => {
          setValue(nextValue as string);
          return true;
        }}
      />
    );
  }

  it("shows the current month-day and commits a valid value", () => {
    const { container } = renderWithProviders(<Harness initialValue="07-26" />);
    const input = container.querySelector("input") as HTMLInputElement;

    expect(input).toHaveValue("07-26");

    fireEvent.change(input, { target: { value: "08-15" } });
    expect(input).toHaveValue("08-15");
  });

  it("normalizes February 29 to February 28 on input", () => {
    const { container } = renderWithProviders(<Harness initialValue="07-26" />);
    const input = container.querySelector("input") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "02-29" } });
    expect(input).toHaveValue("02-28");
  });

  it("ignores malformed input", () => {
    const { container } = renderWithProviders(<Harness initialValue="07-26" />);
    const input = container.querySelector("input") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "abc" } });
    expect(input).toHaveValue("07-26");
  });

  it("disables the input while saving or loading", () => {
    renderWithProviders(<Harness initialValue="07-26" disabled />);

    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
