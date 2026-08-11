import React, { useCallback, useEffect, useMemo } from "react";
import { usePreferenceWithBootstrap } from "@/hooks/queries/usePreferenceWithBootstrap";
import {
  AVAILABLE_FONTS,
  applyFont,
  getSavedFont,
  saveFont,
  type AppFont,
} from "@/config/fontCatalog";
import { FontContext } from "./FontContext";

const FONT_PREFERENCE_KEY = "appearance.font";

interface FontProviderProps {
  children: React.ReactNode;
}

export function FontProvider({ children }: FontProviderProps) {
  const storedFont = useMemo<AppFont>(() => {
    return getSavedFont() ?? "system";
  }, []);

  const preference = usePreferenceWithBootstrap<AppFont>({
    key: FONT_PREFERENCE_KEY,
    defaultValue: storedFont,
    module: "appearance",
    validator: (value) => AVAILABLE_FONTS.includes(value),
  });

  useEffect(() => {
    if (!preference.bootstrapped) return;
    applyFont(preference.value);
  }, [preference.bootstrapped, preference.value]);

  const updateFontValue = useCallback(
    (nextFont: AppFont) => {
      applyFont(nextFont);
      preference.updateValue(nextFont);
    },
    [preference],
  );

  const saveFontValue = useCallback(
    async (nextFont: AppFont) => {
      return await preference.saveValue(nextFont);
    },
    [preference],
  );

  const setFont = useCallback(
    async (nextFont: AppFont) => {
      updateFontValue(nextFont);
      saveFont(nextFont);
      await preference.saveValue(nextFont);
    },
    [preference, updateFontValue],
  );

  const value = useMemo(
    () => ({
      ...preference,
      value: preference.value,
      updateValue: updateFontValue,
      saveValue: saveFontValue,
      font: preference.value,
      setFont,
    }),
    [preference, updateFontValue, saveFontValue, setFont],
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}
