import { useCallback, useEffect, useMemo } from "react";
import { MODULES } from "@/config/modulesConfig";
import { useModuleConfig } from "@/hooks/useModuleConfig";
import { usePreferenceWithBootstrap } from "./usePreferenceWithBootstrap";

const VISIBLE_MODULES_KEY = "navigation.visible_modules";
const VISIBLE_MODULES_SYNC_KEY = "navigation.visible_modules.sync";

function resolveAllowedModuleKeys(meta?: {
  allowed_values?: unknown[];
}): string[] {
  const allowed = meta?.allowed_values;
  if (Array.isArray(allowed)) {
    return allowed.map((value) => String(value));
  }
  return MODULES.map((module) => module.key);
}

export function useVisibleModules() {
  const { modules } = useModuleConfig();

  const defaultVisible: string[] = useMemo(
    () => MODULES.filter((m) => m.showInNav).map((m) => m.key),
    [],
  );

  const {
    value: visibleKeys,
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
    validator: (value, preferenceMeta) => {
      if (!Array.isArray(value)) return false;
      const allowed = new Set(resolveAllowedModuleKeys(preferenceMeta));
      return value.every((key) => allowed.has(key));
    },
  });

  // Allowed keys come from the same response that carries the value, so no
  // second request is needed.
  const allowedKeys = useMemo(
    () => new Set(resolveAllowedModuleKeys(meta)),
    [meta],
  );

  const updateVisibleKeys = (keys: string[]) => {
    const sanitized = Array.from(
      new Set(keys.filter((k) => allowedKeys.has(k))),
    );
    updateValue(sanitized);
  };

  const broadcastVisibleModules = useCallback((keys: string[]) => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        VISIBLE_MODULES_SYNC_KEY,
        JSON.stringify({
          visibleKeys: keys,
          timestamp: Date.now(),
        }),
      );
    } catch {
      // ignore storage failures (e.g., private mode)
    }
  }, []);

  const saveVisibleKeys = async (keys: string[] = visibleKeys) => {
    const sanitized = Array.from(
      new Set(keys.filter((k) => allowedKeys.has(k))),
    );
    const success = await saveValue(sanitized);

    if (success) {
      broadcastVisibleModules(sanitized);
    }

    return success;
  };

  const resetToDefault = () => {
    updateValue(defaultVisible);
    broadcastVisibleModules(defaultVisible);
  };

  // Cross-instance sync: listen for storage events dispatched by other tabs
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: StorageEvent) => {
      if (event.key !== VISIBLE_MODULES_SYNC_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as {
          visibleKeys?: string[];
        };
        if (Array.isArray(parsed.visibleKeys)) {
          const sanitized = Array.from(
            new Set(parsed.visibleKeys.filter((k) => allowedKeys.has(k))),
          );
          updateValue(sanitized);
        }
      } catch {
        // ignore malformed payloads
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [allowedKeys, updateValue, broadcastVisibleModules]);

  const allConfigurableModules = useMemo(() => {
    // Map allowed module keys to existing module configs for labels/icons
    const allowedSet = allowedKeys;
    return modules.filter((m) => allowedSet.has(m.key) && m.key !== "settings");
  }, [allowedKeys, modules]);

  return {
    visibleKeys,
    loading,
    saving,
    error,
    bootstrapped,
    updateVisibleKeys,
    saveVisibleKeys,
    resetToDefault,
    allConfigurableModules,
  };
}
