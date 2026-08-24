import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import zhCommon from "@/locales/zh/common.json";
import enCommon from "@/locales/en/common.json";

const resources = {
  zh: {
    common: zhCommon,
  },
  en: {
    common: enCommon,
  },
};

export const supportedLanguages = [
  { code: "zh", name: "中文", nativeName: "中文" },
  { code: "en", name: "English", nativeName: "English" },
];

export const defaultLanguage = "zh";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLanguage,
    defaultNS: "common",
    ns: ["common"],

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    react: {
      useSuspense: false,
    },
  });

/**
 * Get translation for service layer
 * This utility allows services to access translations without React hooks
 */
export const t = (key: string, options?: Record<string, unknown>): string => {
  return i18n.t(key, options);
};
