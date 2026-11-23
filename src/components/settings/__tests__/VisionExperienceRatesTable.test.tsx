import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VisionExperienceRatesTable from "@/components/settings/VisionExperienceRatesTable";
import type { Vision } from "@/services/api/visions";
import { renderWithProviders, setupTranslationMock } from "@test/utils";

const VISION_ID = "11111111-1111-4111-8111-111111111111";

const makeVision = (rate: number | null): Vision =>
  ({
    id: VISION_ID,
    name: "Vision A",
    status: "active",
    experience_rate_per_hour: rate,
  }) as unknown as Vision;

const makeTableValue = (visions: Vision[]) => ({
  visions,
  defaultRate: 60,
  saving: false,
  error: null,
  onSave: vi.fn(async () => true),
  onRefresh: vi.fn(),
});

const baseProps = {
  disabled: false,
  id: "vision-rates",
  onChange: vi.fn(),
  onSave: vi.fn(async () => true),
  saving: false,
  loading: false,
  error: null,
};

describe("VisionExperienceRatesTable", () => {
  beforeEach(() => {
    setupTranslationMock();
  });

  it("adopts refreshed server values while the draft is clean", () => {
    const { rerender } = renderWithProviders(
      <VisionExperienceRatesTable
        {...baseProps}
        value={makeTableValue([makeVision(60)])}
      />,
    );

    const input = screen.getByLabelText(
      "settings.visions.experienceTable.rateInputLabel",
    );
    expect(input).toHaveValue("60");

    rerender(
      <VisionExperienceRatesTable
        {...baseProps}
        value={makeTableValue([makeVision(120)])}
      />,
    );

    expect(input).toHaveValue("120");
  });

  it("preserves an unsaved draft when the parent refreshes visions", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(
      <VisionExperienceRatesTable
        {...baseProps}
        value={makeTableValue([makeVision(60)])}
      />,
    );

    const input = screen.getByLabelText(
      "settings.visions.experienceTable.rateInputLabel",
    );
    await user.clear(input);
    await user.type(input, "120");
    expect(input).toHaveValue("120");

    rerender(
      <VisionExperienceRatesTable
        {...baseProps}
        value={makeTableValue([makeVision(60)])}
      />,
    );

    expect(input).toHaveValue("120");
  });
});
