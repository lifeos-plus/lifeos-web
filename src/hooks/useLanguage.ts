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

  const changeLanguage = useCallback(
    async (language: Language) => {
      preference.updateValue(language);
      await applyLanguage(language);
      return true;
    },
    [preference, applyLanguage],
  );

  const saveLanguage = useCallback(
    async (language: Language) => {
      const success = await preference.saveValue(language);
      if (success) {
        await applyLanguage(language);
      }
      return success;
    },
    [preference, applyLanguage],
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
