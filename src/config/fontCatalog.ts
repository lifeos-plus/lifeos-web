/**
 * Interface font options.
 *
 * Fonts are plain CSS font-family stacks (no web-font downloads needed), so
 * the app stays local-first. The Chinese-first stacks give Simplified Chinese
 * glyphs an explicit, comfortable fallback order on Windows / macOS / Linux.
 */
export interface FontOption {
  id: "system" | "yahei" | "pingfang" | "noto" | "serif";
  stack: string;
}

export const FONT_CATALOG: FontOption[] = [
  {
    id: "system",
    stack:
      'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  },
  {
    id: "yahei",
    stack:
      '"Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Source Han Sans SC", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "pingfang",
    stack:
      '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", "Noto Sans SC", "Source Han Sans SC", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "noto",
    stack:
      '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "serif",
    stack:
      '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "宋体", ui-serif, Georgia, serif',
  },
];

export type AppFont = (typeof FONT_CATALOG)[number]["id"];

export const AVAILABLE_FONTS: AppFont[] = FONT_CATALOG.map((option) => option.id);

const FONT_STORAGE_KEY = "app-font";

export function getSavedFont(): AppFont | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(FONT_STORAGE_KEY);
    if (!saved) return null;
    return AVAILABLE_FONTS.includes(saved as AppFont)
      ? (saved as AppFont)
      : null;
  } catch {
    return null;
  }
}

export function saveFont(font: AppFont) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FONT_STORAGE_KEY, font);
  } catch {
    // ignore storage errors
  }
}

export function applyFont(font: AppFont) {
  if (typeof document === "undefined") return;
  const option = FONT_CATALOG.find((candidate) => candidate.id === font);
  if (!option) return;

  const root = document.documentElement;
  root.style.setProperty("--font-sans", option.stack);
  root.style.setProperty("--default-font-family", option.stack);
}

export function initFont() {
  applyFont(getSavedFont() ?? "system");
}
