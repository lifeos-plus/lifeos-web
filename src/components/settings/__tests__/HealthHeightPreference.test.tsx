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

  it("shows the current height and commits a clamped value on input", () => {
    const renderAndType = (value: string) => {
      const view = renderWithProviders(<Harness initialValue={null} />);
      const input = view.getByRole("textbox");
      fireEvent.change(input, { target: { value } });
      return { input, ...view };
    };

    const normal = renderAndType("200");
    expect(normal.input).toHaveValue("200");
    normal.unmount();

    const high = renderAndType("9999");
    expect(high.input).toHaveValue(String(HEALTH_HEIGHT_MAX_CM));
    high.unmount();

    const low = renderAndType("10");
    expect(low.input).toHaveValue(String(HEALTH_HEIGHT_MIN_CM));
    low.unmount();
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

  it("renders no clear button while the height is unset", () => {
    renderWithProviders(<Harness initialValue={null} />);

    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(
      screen.queryByRole("button", {
        name: "settings.health.bodyHeight.clear",
      }),
    ).not.toBeInTheDocument();
  });
});
