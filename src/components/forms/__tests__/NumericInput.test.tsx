import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NumericInput from "@/components/forms/NumericInput";
import { renderWithProviders, setupTranslationMock } from "@test/utils";

describe("NumericInput", () => {
  beforeEach(() => {
    setupTranslationMock();
  });

  it("keeps raw digits while typing and commits once on blur", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn().mockResolvedValue(true);
    renderWithProviders(
      <NumericInput value={null} min={50} max={300} onCommit={onCommit} />,
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "1");
    await user.type(input, "7");
    await user.type(input, "0");

    expect(input).toHaveValue("170");
    expect(onCommit).not.toHaveBeenCalled();

    await user.tab();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(170);
  });

  it("rounds and clamps on commit without rewriting partial input", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn().mockResolvedValue(true);
    renderWithProviders(
      <NumericInput value={null} min={50} max={300} onCommit={onCommit} />,
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "9999");
    expect(input).toHaveValue("9999");

    await user.tab();
    expect(input).toHaveValue("300");
    expect(onCommit).toHaveBeenLastCalledWith(300);

    await user.clear(input);
    await user.type(input, "10");
    await user.tab();
    expect(input).toHaveValue("50");
    expect(onCommit).toHaveBeenLastCalledWith(50);
  });

  it("commits an empty draft as null when empty values are allowed", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn().mockResolvedValue(true);
    renderWithProviders(
      <NumericInput value={170} allowEmpty onCommit={onCommit} />,
    );

    const input = screen.getByRole("textbox");
    await user.clear(input);
    expect(onCommit).not.toHaveBeenCalled();

    await user.tab();
    expect(onCommit).toHaveBeenCalledWith(null);
  });

  it("restores the committed value when empty values are not allowed", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn().mockResolvedValue(true);
    renderWithProviders(
      <NumericInput value={60} allowEmpty={false} onCommit={onCommit} />,
    );

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.tab();

    expect(input).toHaveValue("60");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("commits on Enter and restores on Escape", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn().mockResolvedValue(true);
    renderWithProviders(
      <NumericInput value={60} allowEmpty={false} onCommit={onCommit} />,
    );

    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "120");
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("60");
    expect(onCommit).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, "90");
    await user.keyboard("{Enter}");
    expect(onCommit).toHaveBeenCalledWith(90);
  });

  it("ignores non-digit characters", () => {
    renderWithProviders(<NumericInput value={null} onCommit={vi.fn()} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "1a7.0" } });
    expect(input).toHaveValue("170");
  });

  it("clears the value without racing a blur commit", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [value, setValue] = useState<number | null>(170);
      return (
        <NumericInput
          value={value}
          allowClear
          clearLabel="Clear"
          onCommit={(nextValue) => {
            setValue(nextValue);
          }}
        />
      );
    }

    renderWithProviders(<Harness />);
    const input = screen.getByRole("textbox");

    await user.click(input);
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(input).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });
});
