import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { visionsApi } from "@/services/api/visions";
import { visionsKeys } from "@/services/api/queryKeys";
import { usePreferenceWithBootstrap } from "./usePreferenceWithBootstrap";
import type { UUID } from "@/types/primitive";

const DEFAULT_INBOX_VISION_KEY = "todos.default_inbox_vision";

const isVisionId = (value: unknown): value is UUID =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );

/**
 * The preference on its own. Use this when only the selected vision id is
 * needed (planning groups), so no visions list is fetched as a side effect.
 */
export function useDefaultInboxVisionPreference() {
  const {
    value: defaultInboxVision,
    loading,
    saving,
    error,
    bootstrapped,
    saveValue,
    updateValue,
  } = usePreferenceWithBootstrap<UUID | null>({
    key: DEFAULT_INBOX_VISION_KEY,
    defaultValue: null,
    module: "todos",
    validator: (value) => value === null || isVisionId(value),
  });

  return {
    defaultInboxVision,
    loading,
    saving,
    error,
    bootstrapped,
    saveDefaultInboxVision: async (visionId: UUID | null) =>
      await saveValue(visionId),
    updateDefaultInboxVision: (visionId: UUID | null) => updateValue(visionId),
  };
}

/**
 * Preference plus the selectable visions, for the settings page.
 */
export function useDefaultInboxVision() {
  const page = 1;
  const size = 100;
  const preference = useDefaultInboxVisionPreference();

  const {
    data: availableVisionsRaw,
    isLoading: isLoadingVisions,
    error: visionsError,
  } = useQuery({
    queryKey: visionsKeys.list({ status: "active", page, size }),
    queryFn: async () => {
      const response = await visionsApi.getAll("active", page, size);
      // Shares the cache key with useVisionManager, which also returns items.
      return response.items ?? [];
    },
    select: (items) => items.map((v) => ({ id: v.id, name: v.name })),
  });

  const availableVisions = useMemo(
    () => availableVisionsRaw ?? [],
    [availableVisionsRaw],
  );

  return {
    ...preference,
    availableVisions,
    loading: isLoadingVisions || preference.loading,
    error: visionsError?.message || preference.error || null,
  };
}
