import { useCallback } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import type { UUID } from "@/types/primitive";
import { SelectorSpecialValue } from "@/components/selects/selectorTypes";

export function useTimeLogUIState() {
  // Sort order (default asc), persist until storage is cleared
  const { state: sortOrder, setState: setSortOrder } = usePersistentState<
    "asc" | "desc"
  >({
    key: "tt_sort_order",
    defaultValue: "asc",
    expireInHours: 0,
  });

  const { state: selectedAreaId, setState: setSelectedAreaId } =
    usePersistentState<UUID | "" | null | typeof SelectorSpecialValue.None>({
      key: "tt_selected_area_id",
      defaultValue: "",
      expireInHours: 48,
    });

  const { state: scrollPosition, setState: setScrollPosition } =
    usePersistentState<number>({
      key: "tt_scroll_position",
      defaultValue: 0,
      expireInHours: 24,
    });

  const saveScrollPosition = useCallback(
    (position: number) => setScrollPosition(position),
    [setScrollPosition],
  );

  const restoreScrollPosition = useCallback(() => {
    if (scrollPosition > 0) {
      window.scrollTo({
        top: scrollPosition,
        behavior: "auto",
      });
    }
  }, [scrollPosition]);

  const clearScrollPosition = useCallback(
    () => setScrollPosition(0),
    [setScrollPosition],
  );

  return {
    sortOrder,
    selectedAreaId,
    scrollPosition,

    setSortOrder,
    setSelectedAreaId,
    setScrollPosition,

    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
  };
}
