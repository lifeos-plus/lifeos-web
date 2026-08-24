import { useCallback } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useTaskExpansionState } from "@/hooks/useTaskExpansionState";
import type { UUID } from "@/types/primitive";
export function useVisionUIState() {
  const serializeExpandedVisions = useCallback(
    (set: Set<UUID>) => JSON.stringify(Array.from(set)),
    [],
  );
  const deserializeExpandedVisions = useCallback(
    (str: string) => new Set(JSON.parse(str) as UUID[]),
    [],
  );

  const {
    state: expandedVisions,
    setState: setExpandedVisions,
    isLoaded: visionsLoaded,
    clearState: clearExpandedVisions,
  } = usePersistentState<Set<UUID>>({
    key: "vision_expanded_visions",
    defaultValue: new Set(),
    expireInHours: 48, // 2 days
    serialize: serializeExpandedVisions,
    deserialize: deserializeExpandedVisions,
  });

  const {
    expandedTasksByScope,
    isLoaded: tasksLoaded,
    toggleTaskExpansion,
    removeScope,
    clearExpandedTasks,
  } = useTaskExpansionState({
    key: "vision_expanded_tasks",
    expireInHours: 48, // 2 days
  });

  const {
    state: scrollPosition,
    setState: setScrollPosition,
    isLoaded: scrollLoaded,
    clearState: clearScrollPosition,
  } = usePersistentState<number>({
    key: "vision_scroll_position",
    defaultValue: 0,
    expireInHours: 24, // 1 day
  });

  const toggleVisionExpansion = useCallback(
    (visionId: UUID) => {
      setExpandedVisions((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(visionId)) {
          newSet.delete(visionId);
        } else {
          newSet.add(visionId);
        }
        return newSet;
      });
    },
    [setExpandedVisions],
  );

  // Remove vision from expanded state (when vision is deleted)
  const removeVisionFromExpanded = useCallback(
    (visionId: UUID) => {
      setExpandedVisions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(visionId);
        return newSet;
      });

      removeScope(visionId.toString());
    },
    [setExpandedVisions, removeScope],
  );

  const saveScrollPosition = useCallback(
    (position: number) => {
      setScrollPosition(position);
    },
    [setScrollPosition],
  );

  const restoreScrollPosition = useCallback(() => {
    if (scrollPosition > 0) {
      window.scrollTo(0, scrollPosition);
    }
  }, [scrollPosition]);

  const clearAllUIState = useCallback(() => {
    clearExpandedVisions();
    clearExpandedTasks();
    clearScrollPosition();
  }, [clearExpandedVisions, clearExpandedTasks, clearScrollPosition]);

  const isFullyLoaded = visionsLoaded && tasksLoaded && scrollLoaded;

  return {
    expandedVisions,
    expandedTasksByScope,
    scrollPosition,
    isFullyLoaded,

    toggleVisionExpansion,
    toggleTaskExpansion,
    removeVisionFromExpanded,
    saveScrollPosition,
    restoreScrollPosition,
    clearAllUIState,

    setExpandedVisions,
    setScrollPosition,
  };
}
