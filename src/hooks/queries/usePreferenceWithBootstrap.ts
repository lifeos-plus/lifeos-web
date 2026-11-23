import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { preferencesApi } from "@/services/api/preferences";
import { preferencesKeys, areasKeys } from "@/services/api/queryKeys";
import { logger } from "@/utils/core";
import { setPreferredTimezone } from "@/utils/datetime";


function isSamePreferenceValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

type PreferenceCacheEntry<T> = {
  value: T;
  meta?: {
    allowed_values?: unknown[];
    default_value?: T;
    description?: string;
    module?: string;
  };
};

interface PreferenceWithBootstrapOptions<T> {
  key: string;
  defaultValue: T;
  module?: string;
  validator?: (value: T) => boolean;
}

export interface PreferenceWithBootstrapReturn<T> {
  value: T;
  loading: boolean;
  saving: boolean;
  error: string | null;
  bootstrapped: boolean;
  meta?: PreferenceCacheEntry<T>["meta"];
  saveValue: (value: T) => Promise<boolean>;
  updateValue: (value: T) => void;
}

/**
 * 简化后的偏好设置 Hook：依赖 TanStack Query 的初始数据能力，
 * 避免手动维护冗余的 bootstrapped/isDirty 状态。
 */
export function usePreferenceWithBootstrap<T>({
  key,
  defaultValue,
  module = "general",
  validator,
}: PreferenceWithBootstrapOptions<T>): PreferenceWithBootstrapReturn<T> {
  const queryClient = useQueryClient();

  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  const [value, setValue] = useState<T>(defaultValueRef.current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [hasLocalOverride, setHasLocalOverride] = useState(false);
  const saveFailedRef = useRef(false);
  const isValidValue = (candidate: T) => !validator || validator(candidate);

  // 当切换到新的偏好键时，重置本地状态
  useEffect(() => {
    setValue(defaultValueRef.current);
    setHasLocalOverride(false);
    setError(null);
    setBootstrapped(false);
    saveFailedRef.current = false;
  }, [key]);

  const preferenceQuery = useQuery<PreferenceCacheEntry<T>>({
    queryKey: preferencesKeys.detail(key),
    queryFn: async () => {
      try {
        const res = await preferencesApi.getWithMeta<T>(key);
        let backendValue =
          res.value ?? res.meta?.default_value ?? defaultValueRef.current;

        // 与旧实现保持一致：对布尔值做必要的类型转换
        if (
          typeof defaultValueRef.current === "boolean" &&
          typeof backendValue !== "boolean"
        ) {
          if (typeof backendValue === "number") {
            backendValue = Boolean(backendValue) as T;
          } else if (typeof backendValue === "string") {
            backendValue = (backendValue === "true") as T;
          }
        }

        const nextValue = (backendValue as T) ?? defaultValueRef.current;

        if (!isValidValue(nextValue)) {
          logger.warn(`Invalid value for preference ${key}:`, nextValue);
          return { value: defaultValueRef.current, meta: res.meta };
        }

        return { value: nextValue, meta: res.meta };
      } catch (err) {
        const status =
          typeof err === "object" && err !== null && "status" in err
            ? (err as { status?: number }).status
            : undefined;
        if (status === 404) {
          return { value: defaultValueRef.current, meta: undefined };
        }
        throw err;
      }
    },
    staleTime: 60 * 60 * 1000,
    placeholderData: () => ({
      value: defaultValueRef.current,
      meta: undefined,
    }),
  });

  // `placeholderData` reports `isSuccess` immediately, so only treat the query
  // as loaded once the real response has replaced the placeholder.
  const hasResolvedRemote =
    preferenceQuery.isSuccess && !preferenceQuery.isPlaceholderData;

  useEffect(() => {
    if (hasResolvedRemote) {
      const remoteValue = preferenceQuery.data.value;
      setBootstrapped(true);
      if (!saveFailedRef.current) {
        setError(null);
      }

      if (!hasLocalOverride) {
        setValue(remoteValue);
        setHasLocalOverride(false);
      }
      if (key === "system.timezone") {
        setPreferredTimezone(String(remoteValue ?? ""));
      }
    }
  }, [hasResolvedRemote, preferenceQuery.data, hasLocalOverride, key]);

  useEffect(() => {
    if (preferenceQuery.isError) {
      const message =
        preferenceQuery.error instanceof Error
          ? preferenceQuery.error.message
          : "Failed to load preference";
      logger.error(
        `[usePreferenceWithBootstrap] Error loading ${key}:`,
        preferenceQuery.error,
      );
      setError(message);
      setBootstrapped(true);
      if (!hasLocalOverride) {
        setValue(defaultValueRef.current);
      }
    }
  }, [preferenceQuery.isError, preferenceQuery.error, key, hasLocalOverride]);

  const loading = !hasResolvedRemote && !preferenceQuery.isError;

  const saveMutation = useMutation({
    mutationFn: async (nextValue: T) => {
      await preferencesApi.set<T>(key, nextValue, module);
      return nextValue;
    },
    onSuccess: (nextValue) => {
      saveFailedRef.current = false;
      setHasLocalOverride(false);
      setValue(nextValue);
      setError(null);
      if (key === "system.timezone") {
        setPreferredTimezone(String(nextValue ?? ""));
      }
      queryClient.setQueryData<PreferenceCacheEntry<T>>(
        preferencesKeys.detail(key),
        (previous) => ({
          value: nextValue,
          meta: previous?.meta,
        }),
      );
      queryClient.invalidateQueries({
        queryKey: preferencesKeys.detail(key),
      });

      if (key === "dashboard.area_order") {
        queryClient.setQueryData(areasKeys.order(), nextValue);
        queryClient.invalidateQueries({
          queryKey: areasKeys.order(),
        });
      }
    },
    onError: (mutationError: unknown) => {
      saveFailedRef.current = true;
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Save failed, please try again later";
      setError(message);
    },
  });

  const saveValue = async (nextValue: T): Promise<boolean> => {
    if (!isValidValue(nextValue)) {
      setError("Invalid value");
      return false;
    }

    setSaving(true);
    saveFailedRef.current = false;
    setError(null);
    // Protect the optimistic value only while the write is in flight. A failed
    // save must not block later backend refreshes forever.
    setHasLocalOverride(true);
    try {
      await saveMutation.mutateAsync(nextValue);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
      setHasLocalOverride(false);
    }
  };

  const updateValue = (nextValue: T) => {
    // Only guard values that actually differ from the backend value. Rolling
    // back after a failed save restores the remote value, so it must not keep
    // blocking later refreshes.
    const remoteValue = preferenceQuery.data?.value ?? defaultValueRef.current;
    setHasLocalOverride(!isSamePreferenceValue(nextValue, remoteValue));
    setValue(nextValue);
    setError(null);
    if (key === "system.timezone") {
      setPreferredTimezone(String(nextValue ?? ""));
    }
  };

  return {
    value,
    loading,
    saving,
    error,
    bootstrapped,
    meta: preferenceQuery.data?.meta,
    saveValue,
    updateValue,
  };
}
