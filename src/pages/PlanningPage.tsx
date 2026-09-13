import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import PageLayout from "@/layouts/PageLayout";
import { useVisions } from "@/hooks/queries/useVisions";
import { useCalendarAdapter } from "@/hooks/useCalendarAdapter";
import type { PlanningViewType } from "@/utils/calendar";
import { parseDateKey } from "@/utils/datetime";
import PlanningTaskList from "@/components/PlanningTaskList";
import ToolbarContainer from "@/components/ToolbarContainer";
import { SegmentedControl } from "@/components/forms";
import PeriodNavigation from "@/components/PeriodNavigation";
import EmptyState from "@/components/EmptyState";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { usePlanningTasks } from "@/hooks/queries/usePlanningTasks";
import { usePreferenceWithBootstrap } from "@/hooks/queries/usePreferenceWithBootstrap";
import {
  planningHabitActionsPreference,
  planningViewSupportsHabitActions,
} from "@/hooks/planning/usePlanningTaskGroup";
import { Icon } from "@/components/icons";

const PlanningPage: React.FC = () => {
  const { t } = useTranslation();

  const [viewType, setViewType] = useState<PlanningViewType>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { visions: referenceVisions } = useVisions();
  const { setHeader } = usePageHeader();
  const {
    adapter: calendarAdapter,
    firstDayOfWeek,
    loading: calendarLoading,
  } = useCalendarAdapter();

  const { value: showHabitActions } = usePreferenceWithBootstrap<boolean>(
    planningHabitActionsPreference,
  );

  React.useEffect(() => {
    return () => setHeader({ actions: undefined });
  }, [setHeader]);

  const normalizedDate = useMemo(() => {
    const range = calendarAdapter.getPeriodRange(viewType, selectedDate);
    return parseDateKey(range.start);
  }, [calendarAdapter, viewType, selectedDate]);

  const {
    tasks: tasksForView,
    taskLookup,
    query: tasksQuery,
    prefetch,
  } = usePlanningTasks(viewType, normalizedDate, {
    limit: 100,
    enabled: !calendarLoading,
  });

  const prefetchOtherViewsOnce = useRef(false);

  useEffect(() => {
    // 首次就绪时预热其他视图类型一次，保证切换视图类型有即时缓存；
    // 之后只在相邻周期上预热，避免每次变化都触发 4 个周期的请求风暴。
    if (calendarLoading || prefetchOtherViewsOnce.current) return;
    prefetchOtherViewsOnce.current = true;
    const others: PlanningViewType[] = [
      "7years",
      "year",
      "month",
      "week",
      "day",
    ].filter((vt) => vt !== viewType) as PlanningViewType[];
    others.forEach((vt) => {
      const range = calendarAdapter.getPeriodRange(vt, selectedDate);
      const dateForPrefetch = parseDateKey(range.start);
      void prefetch(vt, dateForPrefetch);
    });
  }, [calendarLoading, calendarAdapter, viewType, selectedDate, prefetch]);

  useEffect(() => {
    if (calendarLoading) return;
    const previousDate = calendarAdapter.getPreviousPeriod(
      selectedDate,
      viewType,
    );
    const nextDate = calendarAdapter.getNextPeriod(selectedDate, viewType);
    void prefetch(viewType, previousDate);
    void prefetch(viewType, nextDate);
  }, [viewType, selectedDate, prefetch, calendarAdapter, calendarLoading]);

  useEffect(() => {
    setLoading(tasksQuery.isLoading);
    setError(tasksQuery.error ? tasksQuery.error.message : null);
  }, [tasksQuery.isLoading, tasksQuery.error]);

  // Compute planning groups directly with useMemo to avoid callback dependency cycles
  // 顶层分组既承载任务列表也承载习惯打卡卡片。当日视图之外的视图在任务为空时
  // 仍需保留分组，否则非空的习惯打卡不会显示。
  const shouldMountPlanningGroups =
    tasksForView.length > 0 ||
    viewType === "day" ||
    (showHabitActions && planningViewSupportsHabitActions(viewType));

  const planningGroups = useMemo(() => {
    if (!calendarAdapter || !shouldMountPlanningGroups) {
      return [];
    }

    return calendarAdapter.buildPlanningGroups(
      viewType,
      selectedDate,
      tasksForView,
      firstDayOfWeek,
    );
  }, [
    calendarAdapter,
    viewType,
    selectedDate,
    tasksForView,
    firstDayOfWeek,
    shouldMountPlanningGroups,
  ]);

  const handleViewTypeChange = (newViewType: PlanningViewType) => {
    setViewType(newViewType);
    setSelectedDate(new Date());
  };

  const navigateToPreviousPeriod = () => {
    const newDate = calendarAdapter.getPreviousPeriod(selectedDate, viewType);
    setSelectedDate(newDate);
  };

  const navigateToCurrentPeriod = () => {
    setSelectedDate(new Date());
  };

  const navigateToNextPeriod = () => {
    const newDate = calendarAdapter.getNextPeriod(selectedDate, viewType);
    setSelectedDate(newDate);
  };

  const renderEmptyState = () => (
    <EmptyState
      icon={
        <Icon name="calendar" size={40} className="text-primary" aria-hidden />
      }
      title={t("planning.emptyState.title")}
      description={t("planning.emptyState.description")}
      className="py-12"
    />
  );

  return (
    <PageLayout>
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorDisplay error={error} />
      ) : (
        <>
          <ToolbarContainer className="mb-4" layout="three-column">
            <div className="flex items-center gap-1 sm:gap-2 w-full lg:w-auto">
              <span className="text-sm sm:text-base  shrink-0">
                {t("planning.viewType.label")}：
              </span>
              <SegmentedControl
                value={viewType}
                options={[
                  { value: "7years", label: t("planning.viewType.sevenYear") },
                  { value: "year", label: t("planning.viewType.year") },
                  { value: "month", label: t("planning.viewType.month") },
                  { value: "week", label: t("target.week") },
                  { value: "day", label: t("target.day") },
                ]}
                onChange={(nextValue) =>
                  handleViewTypeChange(nextValue as PlanningViewType)
                }
              />
            </div>

            <div className="flex items-center justify-center w-full lg:w-auto">
              <PeriodNavigation
                periodType={viewType}
                selectedDate={selectedDate}
                onPrevious={navigateToPreviousPeriod}
                onNext={navigateToNextPeriod}
                onCurrent={navigateToCurrentPeriod}
                onSelectDate={setSelectedDate}
                centerButtonWidth="xl"
              />
            </div>

            <div className="hidden lg:flex justify-end" />
          </ToolbarContainer>

          {planningGroups.length === 0 ? (
            renderEmptyState()
          ) : (
            <div className="w-full space-y-4">
              {planningGroups.map((group) => (
                <PlanningTaskList
                  key={group.id}
                  group={group}
                  visions={referenceVisions}
                  taskLookup={taskLookup}
                  onTaskUpdate={async () => {
                    await tasksQuery.refetch();
                  }}
                  planningCycleType={viewType}
                  calendarAdapter={calendarAdapter}
                />
              ))}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
};

export default PlanningPage;
