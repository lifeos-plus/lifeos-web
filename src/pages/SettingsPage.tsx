import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { AppTheme } from "@/theme";
import type { AppFont } from "@/config/fontCatalog";
import { usePreferenceWithBootstrap } from "@/hooks/queries/usePreferenceWithBootstrap";
import { useDefaultInboxVision } from "@/hooks/queries/useDefaultInboxVision";
import { areasApi } from "@/services/api/areas";
import {
  visionsApi,
  type VisionExperienceRateUpdatePayload,
} from "@/services/api/visions";
import { useLanguage, type Language } from "@/hooks/useLanguage";
import AreaManagerModal from "@/components/AreaManagerModal";
import { useVisibleModules } from "@/hooks/queries/useVisibleModules";
import { useTheme } from "@/contexts/ThemeContext";
import { useFont } from "@/contexts/FontContext";
import { SettingsLayout } from "@/components/settings";
import { useSettingsConfig } from "@/config/settingsConfig";
import { useSystemTimezone } from "@/hooks/useSystemTimezone";
import type { UUID } from "@/types/primitive";
import { VISION_EXPERIENCE_RATE_MAX } from "@/utils/constants";
import { useToast } from "@/contexts/ToastContext";
import { useVisions } from "@/hooks/queries/useVisions";
import {
  coerceNoteCollapseValue,
  useNoteCollapsePreference,
} from "@/hooks/notes/useNoteCollapsePreference";
import {
  DEFAULT_MAYAN_NEW_YEAR_START,
  DEFAULT_SEVEN_YEAR_ANCHOR_YEAR,
  normalizeMayanNewYearStart,
} from "@/utils/calendar";

function SettingsPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const themeSettings = useTheme();
  const fontSettings = useFont();
  const visibleModulesSettings = useVisibleModules();
  const calendarSystemSettings = usePreferenceWithBootstrap<
    "gregorian" | "mayan_13_moon"
  >({
    key: "calendar.system",
    defaultValue: "gregorian",
    module: "calendar",
    validator: (value) => value === "gregorian" || value === "mayan_13_moon",
  });
  const calendarFirstDaySettings = usePreferenceWithBootstrap<number>({
    key: "calendar.first_day_of_week",
    defaultValue: 1,
    module: "calendar",
    validator: (value) =>
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 7,
  });
  const calendarSevenYearAnchorYearSettings =
    usePreferenceWithBootstrap<number>({
      key: "calendar.seven_year_anchor_year",
      defaultValue: DEFAULT_SEVEN_YEAR_ANCHOR_YEAR,
      module: "calendar",
      validator: (value) =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 9999,
    });
  const calendarMayanNewYearStartSettings =
    usePreferenceWithBootstrap<string>({
      key: "calendar.mayan_new_year_start",
      defaultValue: DEFAULT_MAYAN_NEW_YEAR_START,
      module: "calendar",
      validator: (value) => /^\d{2}-\d{2}$/.test(value),
    });

  const visionExperienceSettings = usePreferenceWithBootstrap<number>({
    key: "visions.experience_rate_per_hour",
    defaultValue: 60,
    module: "visions",
    validator: (value) =>
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= VISION_EXPERIENCE_RATE_MAX,
  });

  const areaOrderSettings = usePreferenceWithBootstrap<UUID[]>({
    key: "dashboard.area_order",
    defaultValue: [],
    module: "areas",
    validator: (value) => {
      if (!Array.isArray(value)) return false;
      return value.every(
        (id) =>
          typeof id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id,
          ),
      );
    },
  });
  const defaultInboxVisionSettings = useDefaultInboxVision();
  const languageSettings = useLanguage();
  const timezoneSettings = useSystemTimezone();
  const noteCollapseSettings = useNoteCollapsePreference();
  const healthWeightUnitSettings = usePreferenceWithBootstrap<string>({
    key: "health.weight_unit",
    defaultValue: "kg",
    module: "health",
    validator: (value) => value === "kg" || value === "jin" || value === "lb",
  });
  const healthBodyHeightSettings = usePreferenceWithBootstrap<number | null>({
    key: "health.body_height_cm",
    defaultValue: null,
    module: "health",
    validator: (value) =>
      value === null ||
      (typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 50 &&
        value <= 300),
  });
  const {
    visions,
    loading: visionsLoading,
    error: visionsError,
    refresh: refreshVisions,
  } = useVisions();
  const [visionRatesSaving, setVisionRatesSaving] = useState(false);
  const [visionRatesError, setVisionRatesError] = useState<string | null>(null);

  const visionExperiencePreference = useMemo(() => {
    return {
      ...visionExperienceSettings,
      saveValue: async (value: number) => {
        const result = await visionExperienceSettings.saveValue(value);
        if (result) {
          await refreshVisions();
        }
        return result;
      },
    };
  }, [visionExperienceSettings, refreshVisions]);

  const handleVisionRatesSave = useCallback(
    async (updates: VisionExperienceRateUpdatePayload[]) => {
      if (updates.length === 0) {
        setVisionRatesError(null);
        return true;
      }
      setVisionRatesSaving(true);
      setVisionRatesError(null);
      try {
        await visionsApi.bulkUpdateExperienceRates(updates);
        await refreshVisions();
        return true;
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : t("settings.visions.experienceTable.toastError");
        setVisionRatesError(message);
        toast.showError(
          t("settings.visions.experienceTable.toastError"),
          message,
        );
        return false;
      } finally {
        setVisionRatesSaving(false);
      }
    },
    [refreshVisions, toast, t],
  );

  const visionExperienceTableValue = useMemo(
    () => ({
      visions,
      defaultRate: visionExperiencePreference.value,
      saving: visionRatesSaving,
      error: visionRatesError ?? visionsError,
      onSave: handleVisionRatesSave,
      onRefresh: refreshVisions,
    }),
    [
      visions,
      visionExperiencePreference.value,
      visionRatesSaving,
      visionRatesError,
      visionsError,
      handleVisionRatesSave,
      refreshVisions,
    ],
  );

  const groupsConfig = useSettingsConfig({
    calendarSystem: calendarSystemSettings.value,
  });

  const [showAreaManager, setShowAreaManager] = useState(false);

  const preferences = useMemo(
    () => ({
      "appearance.theme": {
        value: themeSettings.value,
        loading: themeSettings.loading,
        saving: themeSettings.saving,
        error: themeSettings.error,
        bootstrapped: themeSettings.bootstrapped,
        saveValue: async (value: unknown) =>
          await themeSettings.saveValue(value as AppTheme),
        updateValue: (value: unknown) =>
          themeSettings.updateValue(value as AppTheme),
      },
      "appearance.font": {
        value: fontSettings.value,
        loading: fontSettings.loading,
        saving: fontSettings.saving,
        error: fontSettings.error,
        bootstrapped: fontSettings.bootstrapped,
        saveValue: async (value: unknown) =>
          await fontSettings.saveValue(value as AppFont),
        updateValue: (value: unknown) =>
          fontSettings.updateValue(value as AppFont),
      },
      "navigation.visibleModules": {
        value: visibleModulesSettings.visibleKeys,
        loading: visibleModulesSettings.loading,
        saving: visibleModulesSettings.saving,
        error: visibleModulesSettings.error,
        bootstrapped: visibleModulesSettings.bootstrapped,
        saveValue: async (value: unknown) =>
          await visibleModulesSettings.saveVisibleKeys(value as string[]),
        updateValue: (value: unknown) => {
          visibleModulesSettings.updateVisibleKeys(value as string[]);
        },
      },
      "calendar.calendarSystem": {
        ...calendarSystemSettings,
        saveValue: async (value: unknown) => {
          const nextSystem =
            value === "mayan_13_moon" ? "mayan_13_moon" : "gregorian";
          return await calendarSystemSettings.saveValue(nextSystem);
        },
        updateValue: (value: unknown) => {
          const nextSystem =
            value === "mayan_13_moon" ? "mayan_13_moon" : "gregorian";
          calendarSystemSettings.updateValue(nextSystem);
        },
      },
      "calendar.firstDayOfWeek": {
        ...calendarFirstDaySettings,
        saveValue: async (value: unknown) =>
          await calendarFirstDaySettings.saveValue(Number(value)),
        updateValue: (value: unknown) =>
          calendarFirstDaySettings.updateValue(Number(value)),
      },
      "calendar.sevenYearAnchorYear": {
        ...calendarSevenYearAnchorYearSettings,
        saveValue: async (value: unknown) =>
          await calendarSevenYearAnchorYearSettings.saveValue(
            typeof value === "number" && Number.isInteger(value)
              ? value
              : DEFAULT_SEVEN_YEAR_ANCHOR_YEAR,
          ),
        updateValue: (value: unknown) =>
          calendarSevenYearAnchorYearSettings.updateValue(
            typeof value === "number" && Number.isInteger(value)
              ? value
              : DEFAULT_SEVEN_YEAR_ANCHOR_YEAR,
          ),
      },
      "calendar.mayanNewYearStart": {
        ...calendarMayanNewYearStartSettings,
        saveValue: async (value: unknown) =>
          await calendarMayanNewYearStartSettings.saveValue(
            normalizeMayanNewYearStart(value),
          ),
        updateValue: (value: unknown) =>
          calendarMayanNewYearStartSettings.updateValue(
            normalizeMayanNewYearStart(value),
          ),
      },
      "visions.experienceRatePerHour": {
        ...visionExperiencePreference,
        saveValue: async (value: unknown) =>
          await visionExperiencePreference.saveValue(value as number),
        updateValue: (value: unknown) =>
          visionExperiencePreference.updateValue(value as number),
      },
      "visions.experienceRateOverrides": {
        value: visionExperienceTableValue,
        loading: visionsLoading,
        saving: visionRatesSaving,
        error: visionRatesError ?? visionsError,
        bootstrapped: !visionsLoading,
        saveValue: async () => true,
        updateValue: () => undefined,
      },
      "notes.minCollapsedLines": {
        ...noteCollapseSettings,
        saveValue: async (value: unknown) =>
          await noteCollapseSettings.saveValue(coerceNoteCollapseValue(value)),
        updateValue: (value: unknown) =>
          noteCollapseSettings.updateValue(coerceNoteCollapseValue(value)),
      },
      "data.areaOrder": {
        value: areaOrderSettings.value,
        loading: areaOrderSettings.loading,
        saving: areaOrderSettings.saving,
        error: areaOrderSettings.error,
        bootstrapped: areaOrderSettings.bootstrapped,
        saveValue: async (value: unknown) => {
          let incoming = value as UUID[];
          if (Array.isArray(incoming) && incoming.length === 0) {
            // Fallback: if empty, backfill with all areas order before saving
            const areasResponse = await areasApi.getAreas();
            incoming = (areasResponse.items ?? []).map(
              (area) => area.id as UUID,
            );
          }
          await areasApi.setOrder(incoming);
          areaOrderSettings.updateValue(incoming);
          return true;
        },
        updateValue: (value: unknown) => {
          areaOrderSettings.updateValue(value as UUID[]);
        },
      },
      "data.defaultInboxVision": {
        value: defaultInboxVisionSettings.defaultInboxVision,
        loading: defaultInboxVisionSettings.loading,
        saving: defaultInboxVisionSettings.saving,
        error: defaultInboxVisionSettings.error,
        bootstrapped: defaultInboxVisionSettings.bootstrapped,
        saveValue: async (value: unknown) =>
          await defaultInboxVisionSettings.saveDefaultInboxVision(
            value as UUID | null,
          ),
        updateValue: (value: unknown) =>
          defaultInboxVisionSettings.updateDefaultInboxVision(
            value as UUID | null,
          ),
      },
      "language.language": {
        value: languageSettings.currentLanguage,
        loading: languageSettings.loading,
        saving: false, // languageSettings doesn't have saving property
        error: languageSettings.error,
        bootstrapped: languageSettings.bootstrapped,
        saveValue: async (value: unknown) =>
          await languageSettings.saveLanguage(value as Language),
        updateValue: async (value: unknown) => {
          return await languageSettings.changeLanguage(value as Language);
        },
      },
      "language.timezone": {
        ...timezoneSettings,
        saveValue: async (value: unknown) =>
          await timezoneSettings.saveValue(value as string),
        updateValue: (value: unknown) =>
          timezoneSettings.updateValue(value as string),
      },
      "health.weightUnit": {
        ...healthWeightUnitSettings,
        saveValue: async (value: unknown) =>
          await healthWeightUnitSettings.saveValue(value as string),
        updateValue: (value: unknown) =>
          healthWeightUnitSettings.updateValue(value as string),
      },
      "health.bodyHeightCm": {
        ...healthBodyHeightSettings,
        saveValue: async (value: unknown) =>
          await healthBodyHeightSettings.saveValue(
            typeof value === "number" ? value : null,
          ),
        updateValue: (value: unknown) =>
          healthBodyHeightSettings.updateValue(
            typeof value === "number" ? value : null,
          ),
      },
    }),
    [
      themeSettings,
      fontSettings,
      visibleModulesSettings,
      calendarSystemSettings,
      calendarFirstDaySettings,
      calendarSevenYearAnchorYearSettings,
      calendarMayanNewYearStartSettings,
      visionExperiencePreference,
      noteCollapseSettings,
      areaOrderSettings,
      defaultInboxVisionSettings,
      languageSettings,
      timezoneSettings,
      healthWeightUnitSettings,
      healthBodyHeightSettings,
      visionExperienceTableValue,
      visionsLoading,
      visionRatesSaving,
      visionRatesError,
      visionsError,
    ],
  );

  // Calculate loading and saving states
  const isLoading = useMemo(() => {
    return Object.values(preferences).some((pref) => pref.loading);
  }, [preferences]);

  const isSaving = useMemo(() => {
    return Object.values(preferences).some((pref) => pref.saving);
  }, [preferences]);

  const handleAreaManagerClose = () => {
    setShowAreaManager(false);
  };

  return (
    <>
      <SettingsLayout
        groups={groupsConfig}
        preferences={preferences}
        loading={isLoading}
        disabled={isSaving}
      />

      <AreaManagerModal
        isOpen={showAreaManager}
        onClose={handleAreaManagerClose}
      />
    </>
  );
}

export default SettingsPage;
