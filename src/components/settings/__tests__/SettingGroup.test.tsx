import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@test/utils";
import SettingGroup from "@/components/settings/SettingGroup";
import type { SettingGroupConfig } from "@/components/settings/types";
import type { PreferenceWithBootstrapReturn } from "@/hooks/queries/usePreferenceWithBootstrap";

const config: SettingGroupConfig = {
  id: "appearance",
  title: "Appearance",
  description: "Appearance settings",
  items: [
    {
      key: "theme",
      type: "custom",
      label: "Theme",
      render: () => null,
    },
  ],
};

const preference = {
  value: undefined,
  setValue: vi.fn(),
  error: "boom",
  saving: false,
  loading: false,
  save: vi.fn(),
  saveValue: vi.fn(),
  commit: vi.fn(),
  clearError: vi.fn(),
} as unknown as PreferenceWithBootstrapReturn<unknown>;

describe("SettingGroup", () => {
  it("surfaces a translated error when a preference fails to save", () => {
    renderWithProviders(
      <SettingGroup
        config={config}
        preferences={{ "appearance.theme": preference }}
      />,
    );

    expect(screen.getByText("settings.saveFailed")).toBeInTheDocument();
  });
});
