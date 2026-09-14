import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastContext } from "@/contexts/ToastContext";
import { usePlanningTaskGroup } from "@/hooks/planning/usePlanningTaskGroup";
import type { HabitActionWithHabit } from "@/services/api/habits";
import type { PlanningGroup } from "@/utils/calendar";
import { setupTranslationMock } from "@test/utils";

setupTranslationMock();

const { preferenceState, habitActionsMock } = vi.hoisted(() => ({
  preferenceState: { showHabitActions: true },
  habitActionsMock: vi.fn(),
}));

vi.mock("@/hooks/useCalendarAdapter", () => ({
  usePlanningCycle: () => ({
    getDefaultCycleSettings: () => ({ days: 7 }),
    adapter: {
      getPeriodRange: () => ({ start: "2026-07-06", end: "2026-07-12" }),
      getNextPeriod: () => new Date("2026-07-13T00:00:00"),
    },
  }),
}));

vi.mock("@/hooks/queries/useDefaultInboxVision", () => ({
  useDefaultInboxVision: () => ({ defaultInboxVision: "vision-1" }),
}));

vi.mock("@/hooks/queries/usePreferenceWithBootstrap", () => ({
  usePreferenceWithBootstrap: () => ({
    value: preferenceState.showHabitActions,
  }),
}));

vi.mock("@/hooks/queries/useTaskTimelogs", () => ({
  useMultipleTaskTimelogs: () => ({ taskTimelogs: new Map() }),
}));

vi.mock("@/hooks/queries/useHabitActionsInRange", () => ({
  useHabitActionsInRange: () => ({
    data: habitActionsMock(),
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useTaskExpansionState", () => ({
  useTaskExpansionState: () => ({
    getExpandedTasks: () => new Set(),
    toggleTaskExpansion: vi.fn(),
  }),
}));

vi.mock("@/hooks/usePersistentState", () => ({
  usePersistentState: () => ({ state: "all", setState: vi.fn() }),
}));

const toastValue = {
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ToastContext.Provider value={toastValue}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ToastContext.Provider>
    );
  };
};

const habitAction = {
  id: "action-1",
  habit_id: "habit-1",
  action_date: "2026-07-07",
  status: "pending",
  habit: {
    id: "habit-1",
    title: "Read",
    description: null,
    start_date: "2026-07-01",
    duration_days: 30,
    area_id: null,
  },
} as unknown as HabitActionWithHabit;

const topLevelWeekGroup: PlanningGroup = {
  id: "week-2026-6-6",
  label: "第 2 周",
  date: new Date("2026-07-06T00:00:00"),
  tasks: [],
  children: [],
};

const nestedDayGroup: PlanningGroup = {
  id: "day-2026-6-6-0",
  label: "7月6日",
  date: new Date("2026-07-06T00:00:00"),
  tasks: [],
  children: [],
};

describe("usePlanningTaskGroup habit visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferenceState.showHabitActions = true;
    habitActionsMock.mockReturnValue([habitAction]);
  });

  it("surfaces check-ins for an empty top-level week group when the preference is on", () => {
    const { result } = renderHook(
      () =>
        usePlanningTaskGroup({
          group: topLevelWeekGroup,
          visions: [],
          planningCycleType: "week",
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.showHabitActionsCard).toBe(true);
    expect(result.current.habitActions).toHaveLength(1);
  });

  it("hides check-ins when the preference is off", () => {
    preferenceState.showHabitActions = false;

    const { result } = renderHook(
      () =>
        usePlanningTaskGroup({
          group: topLevelWeekGroup,
          visions: [],
          planningCycleType: "week",
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.showHabitActionsCard).toBe(false);
  });

  it("only surfaces check-ins on the top-level group", () => {
    const { result } = renderHook(
      () =>
        usePlanningTaskGroup({
          group: nestedDayGroup,
          visions: [],
          planningCycleType: "week",
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.showHabitActionsCard).toBe(false);
  });
});
