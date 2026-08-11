import { createContext, useContext } from "react";
import type { PreferenceWithBootstrapReturn } from "@/hooks/queries/usePreferenceWithBootstrap";
import type { AppFont } from "@/config/fontCatalog";

interface FontContextValue extends PreferenceWithBootstrapReturn<AppFont> {
  font: AppFont;
  setFont: (nextFont: AppFont) => Promise<void>;
}

export const FontContext = createContext<FontContextValue | null>(null);

export function useFont() {
  const context = useContext(FontContext);

  if (!context) {
    throw new Error("useFont must be used within FontProvider");
  }

  return context;
}
