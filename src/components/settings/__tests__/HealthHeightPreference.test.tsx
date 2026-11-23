import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HealthHeightPreference, {
  HEALTH_HEIGHT_MAX_CM,
  HEALTH_HEIGHT_MIN_CM,
} from "@/components/settings/HealthHeightPreference";
import { renderWithProviders, setupTranslationMock } from "@test/utils";

describe("HealthHeightPreference", () => {
  beforeEach(() => {
    setupTranslationMock();
  });

  const baseProps = {
    onChange: vi.fn(),
    onSave: vi.fn().mockResolvedValue(true),
    saving: false,
    loading: false,
    disabled: false,
    id: "health-height-input",
  };

  function Harness({ initialValue }: { initialValue: number | null }) {
    const [value, setValue] = useState<number | null>(initialValue);
    return (
      <HealthHeightPreference
        {...baseProps}
        value={value}
        onCommit={async (nextValue) => {
          setValue(nextValue as number | null);
          return true;
        }}
      />
    );
  }

  it("accepts multiple digits without committing on every keystroke", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initialValue={null} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "170");

    expect(input).toHaveValue("170");
  });

  it("commits the complete clamped value on blur", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initialValue={null} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "9999");
    expect(input).toHaveValue("9999");

    await user.tab();
    expect(input).toHaveValue(String(HEALTH_HEIGHT_MAX_CM));

    await user.clear(input);
    await user.type(input, "10");
    await user.tab();
    expect(input).toHaveValue(String(HEALTH_HEIGHT_MIN_CM));
  });

  it("commits the value on Enter", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initialValue={null} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "172{Enter}");

    expect(input).toHaveValue("172");
    expect(input).not.toHaveFocus();
  });

  it("clears the height back to null via the clear button", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initialValue={170} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("170");

    await user.click(
      screen.getByRole("button", { name: "settings.health.bodyHeight.clear" }),
    );
    expect(input).toHaveValue("");
    expect(
      screen.queryByRole("button", {
        name: "settings.health.bodyHeight.clear",
      }),
    ).not.toBeInTheDocument();
  });

  it("commits null when the field is emptied and blurred", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initialValue={170} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);
    expect(input).toHaveValue("");

    await user.tab();
    expect(input).toHaveValue("");
    expect(
      screen.queryByRole("button", {
        name: "settings.health.bodyHeight.clear",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders no clear button while the height is unset", () => {
    renderWithProviders(<Harness initialValue={null} />);

    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(
      screen.queryByRole("button", {
        name: "settings.health.bodyHeight.clear",
      }),
    ).not.toBeInTheDocument();
  });

  it("drops non-digit characters", () => {
    renderWithProviders(<Harness initialValue={null} />);

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "17a0" },
    });
    expect(screen.getByRole("textbox")).toHaveValue("170");
  });
});
