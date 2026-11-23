import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supportedLanguages, defaultLanguage } from "@/i18n";
import { usePreferenceWithBootstrap } from "@/hooks/queries/usePreferenceWithBootstrap";

export type Language = "zh" | "en" | "auto";

interface LanguageOption {
  value: Language;
  label: string;
}

const PREFERENCE_KEY = "system.language";

function isLanguage(value: unknown): value is Language {
  return value === "auto" || value === "zh" || value === "en";
}

export function useLanguage() {
  const { t, i18n } = useTranslation();

  const preference = usePreferenceWithBootstrap<Language>({
    key: PREFERENCE_KEY,
    defaultValue: "auto",
    module: "system",
    validator: isLanguage,
  });

  const languageOptions: LanguageOption[] = [
    { value: "auto", label: t("settings.language.system") },
    { value: "zh", label: "中文" },
    { value: "en", label: "English" },
  ];

  const applyLanguage = useCallback(
    async (language: Language) => {
      const detected = i18n.services?.languageDetector?.detect();
      const target =
        language === "auto" ? (detected ?? defaultLanguage) : language;
      await i18n.changeLanguage(target);
      try {
        localStorage.setItem(
          "i18nextLng",
          language === "auto" ? target : language,
        );
      } catch {
        // ignore storage failures (e.g. private mode)
      }
    },
    [i18n],
  );

  // The stored preference is the single source of truth, including "auto".
  useEffect(() => {
    if (!preference.bootstrapped) return;
    void applyLanguage(preference.value);
  }, [preference.bootstrapped, preference.value, applyLanguage]);

  // The effect above applies every value change, including local edits and
  // saves, so these helpers only drive the stored preference.
  const changeLanguage = useCallback(
    async (language: Language) => {
      preference.updateValue(language);
      return true;
    },
    [preference],
  );

  const saveLanguage = useCallback(
    (language: Language) => preference.saveValue(language),
    [preference],
  );

  return {
    currentLanguage: preference.value,
    languageOptions,
    changeLanguage,
    saveLanguage,
    loading: preference.loading,
    saving: preference.saving,
    error: preference.error,
    bootstrapped: preference.bootstrapped,
    supportedLanguages,
  };
}
