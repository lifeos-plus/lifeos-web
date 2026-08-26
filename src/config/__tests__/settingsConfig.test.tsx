import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useSettingsConfig } from "@/config/settingsConfig";

vi.mock("@/hooks/queries/useVisibleModules", () => ({
  useVisibleModules: () => ({
    allConfigurableModules: [
      {
        key: "planning",
        navLabel: "Planning",
      },
    ],
  }),
}));

vi.mock("@/hooks/queries/useDefaultInboxVision", () => ({
  useDefaultInboxVision: () => ({
    availableVisions: [],
  }),
}));

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    languageOptions: [
      {
        value: "en",
        label: "English",
      },
    ],
  }),
}));

describe("useSettingsConfig", () => {
  it("exposes calendar system and first-day preferences", () => {
    const { result } = renderHook(() => useSettingsConfig());

    const calendarGroup = result.current.find((group) => group.id === "calendar");

    expect(calendarGroup).toBeDefined();
    expect(calendarGroup?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "calendarSystem",
          type: "select",
          options: expect.arrayContaining([
            expect.objectContaining({ value: "gregorian" }),
            expect.objectContaining({ value: "mayan_13_moon" }),
          ]),
        }),
        expect.objectContaining({
          key: "sevenYearAnchorYear",
          type: "number",
        }),
        expect.objectContaining({
          key: "firstDayOfWeek",
          type: "select",
          options: expect.arrayContaining([
            expect.objectContaining({ value: "1" }),
            expect.objectContaining({ value: "7" }),
          ]),
        }),
      ]),
    );
  });

  it("hides first-day selection for Mayan 13 Moon calendar", () => {
    const { result } = renderHook(() =>
      useSettingsConfig({ calendarSystem: "mayan_13_moon" }),
    );

    const calendarGroup = result.current.find((group) => group.id === "calendar");
    const firstDayItem = calendarGroup?.items.find(
      (item) => item.key === "firstDayOfWeek",
    );
    const anchorYearItem = calendarGroup?.items.find(
      (item) => item.key === "sevenYearAnchorYear",
    );
    const mayanNewYearItem = calendarGroup?.items.find(
      (item) => item.key === "mayanNewYearStart",
    );

    expect(firstDayItem).toBeUndefined();
    expect(anchorYearItem).toEqual(
      expect.objectContaining({
        type: "number",
      }),
    );
    expect(mayanNewYearItem).toEqual(
      expect.objectContaining({
        type: "custom",
      }),
    );
    const rendered = mayanNewYearItem?.render?.({
      value: "03-01",
      onChange: vi.fn(),
      onSave: vi.fn(async () => true),
      onCommit: vi.fn(async () => true),
      saving: false,
      loading: false,
      error: null,
      disabled: false,
      id: "mayan-new-year-start",
    });
    expect(rendered).toBeTruthy();
  });

  it("exposes a health group with weight unit and body height preferences", () => {
    const { result } = renderHook(() => useSettingsConfig());

    const healthGroup = result.current.find((group) => group.id === "health");

    expect(healthGroup).toBeDefined();
    expect(healthGroup?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "weightUnit",
          type: "select",
          options: expect.arrayContaining([
            expect.objectContaining({ value: "kg" }),
            expect.objectContaining({ value: "jin" }),
            expect.objectContaining({ value: "lb" }),
          ]),
        }),
        expect.objectContaining({
          key: "bodyHeightCm",
          type: "custom",
        }),
      ]),
    );
  });
});
