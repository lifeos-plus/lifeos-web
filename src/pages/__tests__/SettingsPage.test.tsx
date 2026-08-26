import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsPage from "@/pages/SettingsPage";
import { renderWithProviders, setupTranslationMock } from "@test/utils";

setupTranslationMock();

const preferencesApiMock = vi.hoisted(() => ({
  getWithMeta: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@/services/api/preferences", () => ({
  preferencesApi: preferencesApiMock,
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "system",
    setTheme: vi.fn(),
    resolveTheme: () => "light",
    themes: [],
  }),
}));

vi.mock("@/contexts/FontContext", () => ({
  useFont: () => ({ font: "default", setFont: vi.fn() }),
}));

vi.mock("@/contexts/PageHeaderContext", () => ({
  usePageHeader: () => ({ setHeader: vi.fn() }),
}));

vi.mock("@/layouts/PageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ActionButton", () => ({
  default: ({
    label,
    onClick,
  }: {
    label: string;
    onClick?: () => void;
  }) => <button onClick={onClick}>{label}</button>,
}));

vi.mock("@/hooks/queries/useVisibleModules", () => ({
  useVisibleModules: () => ({
    visibleModules: [],
    allConfigurableModules: [],
    setVisibleModules: vi.fn(),
  }),
}));

vi.mock("@/hooks/queries/useDefaultInboxVision", () => ({
  useDefaultInboxVision: () => ({
    availableVisions: [],
    defaultInboxVision: null,
    setDefaultInboxVision: vi.fn(),
  }),
}));

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    language: "en",
    setLanguage: vi.fn(),
    languageOptions: [{ value: "en", label: "English" }],
  }),
}));

vi.mock("@/hooks/useSystemTimezone", () => ({
  useSystemTimezone: () => ({
    timezone: "UTC",
    setTimezone: vi.fn(),
    loading: false,
  }),
}));

vi.mock("@/hooks/queries/useVisions", () => ({
  useVisions: () => ({ visions: [], loading: false }),
}));

vi.mock("@/hooks/queries/useAreas", () => ({
  useAreas: () => ({ areas: [], loading: false }),
}));

vi.mock("@/hooks/notes/useNoteCollapsePreference", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/hooks/notes/useNoteCollapsePreference")
  >();
  return {
    ...actual,
    useNoteCollapsePreference: () => ({
      value: 5,
      loading: false,
      saving: false,
      error: null,
      saveValue: vi.fn(async () => true),
      updateValue: vi.fn(),
    }),
  };
});

vi.mock("@/services/api/areas", () => ({
  areasApi: {
    list: vi.fn(async () => []),
    getOrder: vi.fn(async () => []),
    updateOrder: vi.fn(async () => true),
  },
}));

vi.mock("@/services/api/visions", () => ({
  visionsApi: {
    list: vi.fn(async () => []),
    getExperienceRate: vi.fn(async () => null),
    updateExperienceRate: vi.fn(async () => true),
  },
}));

vi.mock("@/components/AreaManagerModal", () => ({
  default: () => <div data-testid="area-manager-modal" />,
}));

vi.mock("@/components/settings/VisionExperienceRatesTable", () => ({
  default: () => null,
}));

vi.mock("@/components/settings/VisionExperienceDefaultPreference", () => ({
  default: () => null,
}));

vi.mock("@/components/settings/AreaSorter", () => ({
  default: () => null,
}));

describe("SettingsPage calendar preferences", () => {
  beforeEach(() => {
    preferencesApiMock.getWithMeta.mockImplementation(
      async (key: string) => ({
        key,
        value: key === "calendar.system" ? "mayan_13_moon" : null,
        meta: {
          default_value: null,
          description: "",
          module: "calendar",
          allowed_values: null,
        },
      }),
    );
    preferencesApiMock.set.mockResolvedValue({ key: "", value: null });
  });

  it("saves the Mayan anchor year and new year start preferences", async () => {
    const { container } = renderWithProviders(<SettingsPage />);

    fireEvent.click(screen.getByText("settings.calendar.title"));

    const anchorInput = (await waitFor(() =>
      container.querySelector<HTMLInputElement>("#sevenYearAnchorYear-input"),
    )) as HTMLInputElement;
    expect(anchorInput).toHaveValue("2025");

    fireEvent.change(anchorInput, { target: { value: "2030" } });
    await waitFor(() => {
      expect(preferencesApiMock.set).toHaveBeenCalledWith(
        "calendar.seven_year_anchor_year",
        2030,
        "calendar",
      );
    });

    const mayanInput = container.querySelector<HTMLInputElement>(
      "#mayanNewYearStart-custom",
    ) as HTMLInputElement;
    expect(mayanInput).toHaveValue("07-26");

    fireEvent.change(mayanInput, { target: { value: "08-15" } });
    await waitFor(() => {
      expect(preferencesApiMock.set).toHaveBeenCalledWith(
        "calendar.mayan_new_year_start",
        "08-15",
        "calendar",
      );
    });
  });
});
