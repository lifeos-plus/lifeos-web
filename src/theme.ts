/**
 * Theme list and theme application helpers.
 *
 * `RENDERABLE_THEMES` mirrors the daisyUI `themes:` list declared in
 * `src/index.css`; `src/__tests__/theme.test.ts` fails when the two drift apart.
 *
 * Which themes the user may actually pick is owned by the Web API:
 * `GET /api/v1/preferences/{key}?meta=true` returns `meta.allowed_values` for
 * `appearance.theme`. The local list only describes what this bundle can style,
 * so `resolveAvailableThemes` intersects the contract with it instead of
 * duplicating the backend enum.
 */

const THEME_STORAGE_KEY = "app-theme";

export const RENDERABLE_THEMES = [
  "fresh",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
] as const;

export type RenderableTheme = (typeof RENDERABLE_THEMES)[number];

export type AppTheme = "system" | RenderableTheme;

const RENDERABLE_THEME_SET: ReadonlySet<string> = new Set(RENDERABLE_THEMES);

export function isRenderableTheme(value: unknown): value is RenderableTheme {
  return typeof value === "string" && RENDERABLE_THEME_SET.has(value);
}

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "system" || isRenderableTheme(value);
}

/**
 * Resolve the selectable themes from the API contract.
 *
 * Unknown values are ignored, the order follows this bundle, and a missing or
 * unusable contract falls back to everything this bundle can render so the
 * picker is never empty.
 */
export function resolveAvailableThemes(
  allowed?: readonly unknown[],
): AppTheme[] {
  const allowedSet = new Set((allowed ?? []).filter(isRenderableTheme));
  const ordered = RENDERABLE_THEMES.filter((theme) => allowedSet.has(theme));

  if (ordered.length === 0) {
    return ["system", ...RENDERABLE_THEMES];
  }

  return ["system", ...ordered];
}

/**
 * Keep the theme currently applied by the user selectable even when the
 * contract no longer advertises it (for example a newer CLI wrote a theme this
 * older bundle can still render). Without this the select would render blank.
 */
export function includeCurrentTheme(
  themes: AppTheme[],
  current: AppTheme,
): AppTheme[] {
  if (current === "system" || themes.includes(current)) {
    return themes;
  }
  return [...themes, current];
}

function applyTheme(theme: RenderableTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function applyThemeWithTransition(theme: RenderableTheme) {
  if (typeof document === "undefined") return;

  // Remove initializing class to enable transitions
  document.documentElement.classList.remove("theme-initializing");

  document.documentElement.setAttribute("data-theme", theme);
}

export function getSavedTheme(): AppTheme | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (!saved) return null;
    if (isAppTheme(saved)) return saved;
    return null;
  } catch {
    return null;
  }
}

function saveTheme(theme: AppTheme) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage errors
  }
}

export function resolveSystemTheme(): "pastel" | "night" {
  if (typeof window === "undefined" || !window.matchMedia) return "pastel";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "night" : "pastel";
}

export function initTheme() {
  // Add initializing class to prevent flash during initial load
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("theme-initializing");
  }

  const saved = getSavedTheme();
  const effective: RenderableTheme =
    saved === "system" || !saved ? resolveSystemTheme() : saved;

  // Use regular applyTheme for initial load (no transition)
  applyTheme(effective);

  // Remove initializing class after a short delay to enable transitions
  if (typeof document !== "undefined") {
    setTimeout(() => {
      document.documentElement.classList.remove("theme-initializing");
    }, 100);
  }
}

export function setTheme(next: AppTheme) {
  saveTheme(next);
  const effective: RenderableTheme =
    next === "system" ? resolveSystemTheme() : next;
  applyThemeWithTransition(effective);
}

export function watchSystemThemeChange(
  callback: (theme: "pastel" | "night") => void,
) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => {
    callback(resolveSystemTheme());
  };

  mediaQuery.addEventListener("change", handleChange);
  return () => mediaQuery.removeEventListener("change", handleChange);
}
