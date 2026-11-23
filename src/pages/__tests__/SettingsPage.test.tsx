import type { ComponentProps } from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsPage from "@/pages/SettingsPage";
import { renderWithProviders, setupTranslationMock } from "@test/utils";

setupTranslationMock();

const preferencesApiMock = vi.hoisted(() => ({
  getWithMeta: vi.fn(),
  set: vi.fn(),
}));

const enumSelectProps = vi.hoisted(() => ({} as Record<string, unknown>));

interface CapturedSettingsLayoutProps {
  groups: Array<{ id: string; items: Array<{ key: string }> }>;
  preferences: Record<string, unknown>;
  disabled?: boolean;
}

const settingsLayoutProps = vi.hoisted(() => ({
  current: null as CapturedSettingsLayoutProps | null,
}));

vi.mock("@/components/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/settings")>();
  const ActualSettingsLayout = actual.SettingsLayout;
  return {
    ...actual,
    SettingsLayout: (
      props: ComponentProps<typeof ActualSettingsLayout>,
    ) => {
      settingsLayoutProps.current =
        props as unknown as CapturedSettingsLayoutProps;
      return <ActualSettingsLayout {...props} />;
    },
  };
});

vi.mock("@/components/selects/EnumSelect", () => ({
  default: (props: unknown) => {
    const typed = props as { id: string };
    enumSelectProps[typed.id] = props;
    return <div data-testid={`enum-${typed.id}`} />;
  },
}));

vi.mock("@/services/api/preferences", () => ({
  preferencesApi: preferencesApiMock,
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "system",
    setTheme: vi.fn(),
    availableThemes: ["system", "fresh"],
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
    visibleKeys: [],
    allConfigurableModules: [],
    loading: false,
    saving: false,
    error: null,
    bootstrapped: true,
    updateVisibleKeys: vi.fn(),
    saveVisibleKeys: vi.fn(async () => true),
    resetToDefault: vi.fn(),
  }),
}));

vi.mock("@/hooks/queries/useDefaultInboxVision", () => ({
  useDefaultInboxVision: () => ({
    availableVisions: [],
    defaultInboxVision: null,
    loading: false,
    saving: false,
    error: null,
    bootstrapped: true,
    saveDefaultInboxVision: vi.fn(async () => true),
    updateDefaultInboxVision: vi.fn(),
  }),
}));

vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    currentLanguage: "en",
    languageOptions: [{ value: "en", label: "English" }],
    changeLanguage: vi.fn(async () => true),
    saveLanguage: vi.fn(async () => true),
    loading: false,
    saving: false,
    error: null,
    bootstrapped: true,
    supportedLanguages: [],
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

describe("SettingsPage tab structure", () => {
  beforeEach(() => {
    preferencesApiMock.getWithMeta.mockImplementation(
      async (key: string) => ({
        key,
        value: null,
        meta: {
          default_value: null,
          description: "",
          module: "general",
          allowed_values: null,
        },
      }),
    );
    preferencesApiMock.set.mockResolvedValue({ key: "", value: null });
  });

  it("keeps other settings interactive while one preference is saving", async () => {
    let resolveSet: ((value: unknown) => void) | undefined;
    preferencesApiMock.set.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSet = resolve;
        }),
    );

    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByText("settings.health.title"));

    const height = await screen.findByLabelText(
      "settings.health.bodyHeight.label",
    );
    await waitFor(() => expect(height).toBeEnabled());

    fireEvent.change(height, { target: { value: "170" } });
    fireEvent.blur(height);
    await waitFor(() =>
      expect(preferencesApiMock.set).toHaveBeenCalledWith(
        "health.body_height_cm",
        170,
        "health",
      ),
    );

    // A single in-flight preference must not disable the whole settings page;
    // each control owns its own saving state.
    expect(settingsLayoutProps.current?.disabled).toBeFalsy();

    await act(async () => {
      resolveSet?.({ key: "health.body_height_cm", value: 170 });
    });
  });

  it("hosts area ordering and the default vision in their own tabs", () => {
    renderWithProviders(<SettingsPage />);

    expect(settingsLayoutProps.current?.groups.map((group) => group.id)).toEqual(
      [
        "appearance",
        "navigation",
        "calendar",
        "health",
        "visions",
        "areas",
        "notes",
        "language",
      ],
    );

    const preferences = settingsLayoutProps.current?.preferences ?? {};
    expect(preferences).toHaveProperty("areas.areaOrder");
    expect(preferences).toHaveProperty("visions.defaultInboxVision");
    expect(preferences).not.toHaveProperty("data.areaOrder");
    expect(preferences).not.toHaveProperty("data.defaultInboxVision");
  });
});

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
    renderWithProviders(<SettingsPage />);

    fireEvent.click(screen.getByText("settings.calendar.title"));

    const anchorSelect = (await waitFor(() => {
      const key = Object.keys(enumSelectProps).find((id) =>
        id.includes("sevenYearAnchorYear"),
      );
      return key ? (enumSelectProps[key] as { value: string }) : null;
    })) as { value: string };
    expect(anchorSelect.value).toBe("2025");

    await waitFor(() => {
      const key = Object.keys(enumSelectProps).find((id) =>
        id.includes("sevenYearAnchorYear"),
      ) as string;
      expect(
        (enumSelectProps[key] as { disabled?: boolean }).disabled,
      ).toBe(false);
    });

    (
      enumSelectProps[
        Object.keys(enumSelectProps).find((id) =>
          id.includes("sevenYearAnchorYear"),
        ) as string
      ] as { onChange: (value: string) => void }
    ).onChange("2030");
    await waitFor(() => {
      expect(preferencesApiMock.set).toHaveBeenCalledWith(
        "calendar.seven_year_anchor_year",
        2030,
        "calendar",
      );
    });

    const monthSelect = enumSelectProps[
      "mayanNewYearStart-custom-month"
    ] as { value: string; onChange: (value: string) => void };
    expect(monthSelect.value).toBe("7");

    monthSelect.onChange("8");
    await waitFor(() => {
      expect(preferencesApiMock.set).toHaveBeenCalledWith(
        "calendar.mayan_new_year_start",
        "08-26",
        "calendar",
      );
    });

    const daySelect = enumSelectProps[
      "mayanNewYearStart-custom-day"
    ] as { value: string; onChange: (value: string) => void };
    daySelect.onChange("15");
    await waitFor(() => {
      expect(preferencesApiMock.set).toHaveBeenCalledWith(
        "calendar.mayan_new_year_start",
        "07-15",
        "calendar",
      );
    });
  });
});
