import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  MODULES,
  type ModuleConfigWithI18n,
  type ModuleKey,
} from "@/config/modulesConfig";

export function useModuleConfig() {
  const { t } = useTranslation();

  const modulesWithI18n: ModuleConfigWithI18n[] = useMemo(() => {
    return MODULES.map((module) => ({
      ...module,
      displayName: t(`modules.${module.key}.displayName`),
      navLabel: t(`modules.${module.key}.navLabel`),
      description: t(`modules.${module.key}.description`),
    }));
  }, [t]);

  const navModules: ModuleConfigWithI18n[] = useMemo(() => {
    return modulesWithI18n.filter((module) => module.showInNav);
  }, [modulesWithI18n]);

  const getModuleByKey = useCallback(
    (key: ModuleKey): ModuleConfigWithI18n | undefined => {
      return modulesWithI18n.find((module) => module.key === key);
    },
    [modulesWithI18n],
  );

  const getModuleByPath = useCallback(
    (path: string): ModuleConfigWithI18n | undefined => {
      return modulesWithI18n.find((module) => module.path === path);
    },
    [modulesWithI18n],
  );

  const keyToModuleWithI18n: Record<ModuleKey, ModuleConfigWithI18n> =
    useMemo(() => {
      return modulesWithI18n.reduce(
        (acc, module) => {
          acc[module.key] = module;
          return acc;
        },
        {} as Record<ModuleKey, ModuleConfigWithI18n>,
      );
    }, [modulesWithI18n]);

  const pathToModuleWithI18n: Record<string, ModuleConfigWithI18n> =
    useMemo(() => {
      return modulesWithI18n.reduce(
        (acc, module) => {
          acc[module.path] = module;
          return acc;
        },
        {} as Record<string, ModuleConfigWithI18n>,
      );
    }, [modulesWithI18n]);

  return {
    modules: modulesWithI18n,
    navModules,
    getModuleByKey,
    getModuleByPath,
    keyToModule: keyToModuleWithI18n,
    pathToModule: pathToModuleWithI18n,
  };
}
