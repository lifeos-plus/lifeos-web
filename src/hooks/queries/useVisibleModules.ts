import { useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MODULES } from "@/config/modulesConfig";
import { preferencesKeys } from "@/services/api/queryKeys";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { usePreferenceWithBootstrap } from "./usePreferenceWithBootstrap";
import type { PreferenceMeta } from "@/services/api/preferences";

const VISIBLE_MODULES_KEY = "navigation.visible_modules";
const VISIBLE_MODULES_SYNC_KEY = "navigation.visible_modules.sync";

function sanitizeVisibleKeys(
  keys: string[],
  allowed: Set<string>,
): string[] {
  return Array.from(new Set(keys.filter((key) => allowed.has(key))));
}

function resolveAllowedModuleKeys(
  meta?: PreferenceMeta,
): string[] {
  const allowed = meta?.allowed_values;
  if (Array.isArray(allowed)) {
    return allowed.map((value) => String(value));
  }
  return MODULES.map((module) => module.key);
}

export function useVisibleModules() {
  const { modules } = useModuleConfig();
  const queryClient = useQueryClient();

  const defaultVisible: string[] = useMemo(
    () => MODULES.filter((m) => m.showInNav).map((m) => m.key),
    [],
  );

  const {
    value,
    loading,
    saving,
    error,
    bootstrapped,
    meta,
    saveValue,
    updateValue,
  } = usePreferenceWithBootstrap<string[]>({
    key: VISIBLE_MODULES_KEY,
    defaultValue: defaultVisible,
    module: "navigation",
    // Accept any string list here: an unknown key (a module that was removed,
    // or a key the contract no longer lists) must not reset the whole
    // preference. Rendering and saving still filter against the allowlist.
    validator: (value) =>
      Array.isArray(value) && value.every((key) => typeof key === "string"),
  });

  // Allowed keys come from the same response that carries the value, so no
  // second request is needed.
  const allowedKeys = useMemo(
    () => new Set(resolveAllowedModuleKeys(meta)),
    [meta],
  );

  // Values saved before a module was removed (or keys this contract no longer
  // allows) stay out of the UI even though they remain stored.
  const visibleKeys = useMemo(
    () => sanitizeVisibleKeys(value, allowedKeys),
    [value, allowedKeys],
  );

  const updateVisibleKeys = (keys: string[]) => {
    updateValue(sanitizeVisibleKeys(keys, allowedKeys));
  };

  const broadcastVisibleModules = useCallback(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      // Only a signal: the other tab refetches the preference itself.
      window.localStorage.setItem(VISIBLE_MODULES_SYNC_KEY, String(Date.now()));
    } catch {
      // ignore storage failures (e.g., private mode)
    }
  }, []);

  const saveVisibleKeys = async (keys: string[] = visibleKeys) => {
    const sanitized = sanitizeVisibleKeys(keys, allowedKeys);
    const success = await saveValue(sanitized);

    if (success) {
      broadcastVisibleModules();
    }

    return success;
  };

  // Cross-instance sync: another tab already persisted the value, so refetch
  // instead of keeping a local-only copy.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: StorageEvent) => {
      if (event.key !== VISIBLE_MODULES_SYNC_KEY || !event.newValue) return;
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.detail(VISIBLE_MODULES_KEY),
      });
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [queryClient]);

  const allConfigurableModules = useMemo(
    () =>
      modules.filter((m) => allowedKeys.has(m.key) && m.key !== "settings"),
    [allowedKeys, modules],
  );

  return {
    visibleKeys,
    loading,
    saving,
    error,
    bootstrapped,
    updateVisibleKeys,
    saveVisibleKeys,
    allConfigurableModules,
  };
}
