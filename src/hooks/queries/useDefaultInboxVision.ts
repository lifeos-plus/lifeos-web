import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { visionsApi } from "@/services/api/visions";
import { visionsKeys } from "@/services/api/queryKeys";
import { usePreferenceWithBootstrap } from "./usePreferenceWithBootstrap";
import type { UUID } from "@/types/primitive";

const DEFAULT_INBOX_VISION_KEY = "todos.default_inbox_vision";

export function useDefaultInboxVision() {
  const page = 1;
  const size = 100;
  const {
    data: availableVisionsRaw,
    isLoading: isLoadingVisions,
    error: visionsError,
  } = useQuery({
    queryKey: visionsKeys.list({ status: "active", page, size }),
    queryFn: async () => {
      const response = await visionsApi.getAll("active", page, size);
      // 与 useVisionManager 共享同一缓存 key，统一返回 items 数组形状
      return response.items ?? [];
    },
    select: (items) => items.map((v) => ({ id: v.id, name: v.name })),
  });
  const availableVisions = useMemo(
    () => availableVisionsRaw ?? [],
    [availableVisionsRaw],
  );

  const {
    value: defaultInboxVision,
    loading: preferenceLoading,
    saving,
    error: preferenceError,
    bootstrapped,
    saveValue,
    updateValue,
  } = usePreferenceWithBootstrap<UUID | null>({
    key: DEFAULT_INBOX_VISION_KEY,
    defaultValue: null,
    module: "todos",
    validator: (value) => {
      if (value === null) return true;
      return (
        typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value,
        )
      );
    },
  });

  const saveDefaultInboxVision = async (visionId: UUID | null) => {
    return await saveValue(visionId);
  };

  const updateDefaultInboxVision = (visionId: UUID | null) => {
    updateValue(visionId);
  };

  const resetToDefault = () => {
    updateValue(null);
  };

  const loading = isLoadingVisions || preferenceLoading;
  const error = visionsError?.message || preferenceError || null;

  return {
    defaultInboxVision,
    availableVisions,
    loading,
    saving,
    error,
    bootstrapped,
    saveDefaultInboxVision,
    updateDefaultInboxVision,
    resetToDefault,
  };
}
