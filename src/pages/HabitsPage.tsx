import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { useHabitManager } from "@/features/habits/controller/useHabitManager";
import type { Habit, HabitAction } from "@/services/api/habits";
import { useAllHabits } from "@/hooks/queries/useAllHabits";
import {
  ALL_FILTER_VALUE,
  buildCountedFilterOptions,
} from "@/utils/filterOptionCounts";
import EmptyState from "@/components/EmptyState";
import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import { HabitFormModal } from "@/components/habits/HabitFormModal";
import { HabitActionList } from "@/components/habits/HabitActionList";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import PageLayout from "@/layouts/PageLayout";
import ActionButton, { CreateNewButton } from "@/components/ActionButton";
import StatusBadge from "@/components/StatusBadge";
import EnumSelect from "@/components/selects/EnumSelect";
import AreaSelect from "@/components/selects/AreaSelect";
import { SelectorSpecialValue } from "@/components/selects/selectorTypes";
import AreaBadge from "@/components/AreaBadge";
import ExpandableCard from "@/components/ExpandableCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useCalendarAdapter } from "@/hooks/useCalendarAdapter";
import { useAreas } from "@/hooks/queries/useAreas";
import { useHabitActions } from "@/hooks/queries/useHabitActions";
import { useHabitStats } from "@/hooks/queries/useHabitStats";
import { HABIT_STATUS_FILTER_OPTIONS } from "@/utils/constants";
import type { UUID } from "@/types/primitive";
import type { CalendarAdapter, CalendarSystem } from "@/utils/calendar";
import { Icon } from "@/components/icons";
import { addDays, formatDate } from "@/utils/datetime";

function habitMatchesAreaFilter(
  habit: Habit,
  areaFilter: UUID | null | undefined,
): boolean {
  if (areaFilter === undefined) {
    return true;
  }
  if (areaFilter === null) {
    return !habit.area_id;
  }
  return habit.area_id === areaFilter;
}

function HabitItem({
  habit,
  isExpanded,
  onToggleExpansion,
  onEdit,
  onCopy,
  onStatusUpdate,
  calendarAdapter,
  calendarSystem,
  areaMap,
  t,
}: {
  habit: Habit;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onEdit: (habit: Habit) => void;
  onCopy: (habit: Habit) => void;
  onStatusUpdate: (
    habitId: UUID,
    action: HabitAction,
    newStatus: string,
  ) => void;
  calendarAdapter: CalendarAdapter;
  calendarSystem: CalendarSystem;
  areaMap: Map<UUID, { name: string; color: string }>;
  t: TFunction;
}) {
  const parseHabitDate = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(value);
  };

  const habitStartDate = parseHabitDate(habit.start_date);
  const habitEndDate = addDays(habitStartDate, habit.duration_days - 1);
  const today = new Date();
  const initialCenterDate =
    today < habitStartDate
      ? habitStartDate
      : today > habitEndDate
        ? habitEndDate
        : today;

  const [actionCenterDate, setActionCenterDate] = useState<Date>(
    () => initialCenterDate,
  );

  useEffect(() => {
    const refreshedStart = parseHabitDate(habit.start_date);
    const refreshedEnd = addDays(refreshedStart, habit.duration_days - 1);
    const current = new Date();
    const clamped =
      current < refreshedStart
        ? refreshedStart
        : current > refreshedEnd
          ? refreshedEnd
          : current;
    setActionCenterDate(clamped);
  }, [habit.id, habit.start_date, habit.duration_days]);
  const { actions, query: actionsQuery } = useHabitActions(habit.id, {
    enabled: isExpanded,
    centerDate: actionCenterDate,
    windowSize: 100,
  });
  const { stats } = useHabitStats(habit.id, { enabled: isExpanded });

  const effectiveStats = isExpanded ? (stats ?? habit.stats) : habit.stats;
  const completionRate = effectiveStats
    ? effectiveStats.total_actions > 0
      ? (effectiveStats.completed_actions / effectiveStats.total_actions) * 100
      : 0
    : 0;

  const titleDescriptionContainer = (
    <div className="space-y-3">
      <div className="flex items-center space-x-3 min-w-0">
        <h2 className="text-xl  whitespace-nowrap flex items-center gap-2">
          <Icon name="repeat" size={20} aria-hidden className="text-primary" />
          {habit.title}
        </h2>
        <StatusBadge status={habit.status} type="habit" />
      </div>

      {habit.description && (
        <p className="text-base text-base-content/70 line-clamp-2 lg:line-clamp-3 font-normal break-words">
          {habit.description}
        </p>
      )}
    </div>
  );

  const metadataContainer = (
    <div className="flex flex-wrap items-start justify-start gap-2 sm:gap-4 lg:gap-6 text-sm text-base-content/70 font-normal text-left w-full">
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-base-content/50 flex-shrink-0">
          {t("habits.habit.startDate")}
        </span>
        <span className="truncate">{formatDate(habit.start_date)}</span>
      </div>
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-base-content/50 flex-shrink-0">
          {t("habits.habit.duration")}
        </span>
        <span className="truncate">{habit.duration_days} 天</span>
      </div>
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-base-content/50 flex-shrink-0">
          {t("habits.habit.status")}
        </span>
        <span className="truncate">{habit.status}</span>
      </div>
      {habit.area_id && (
        <AreaBadge
          areaId={habit.area_id as UUID}
          areaMap={areaMap}
          showLabel
        />
      )}
      {effectiveStats && (
        <>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-base-content/50 flex-shrink-0">
              {t("habits.stats.totalActions")}
            </span>
            <span className="truncate">{effectiveStats.total_actions}</span>
          </div>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-base-content/50 flex-shrink-0">
              {t("habits.stats.completionRate")}
            </span>
            <span className="truncate">{completionRate.toFixed(1)}%</span>
          </div>
        </>
      )}
    </div>
  );

  const actionContainer = (
    <div className="flex-shrink-0">
      <div className="flex items-center gap-2">
        <ActionButton
          label={t("common.edit")}
          iconName="edit"
          color="primary"
          size="sm"
          iconOnly
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onEdit(habit);
          }}
        />
        <ActionButton
          label={t("common.copy")}
          iconName="clipboard"
          color="neutral"
          size="sm"
          iconOnly
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onCopy(habit);
          }}
        />
      </div>
    </div>
  );

  const habitTitle = titleDescriptionContainer;

  const habitSubtitle = (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 w-full">
      <div className="flex-shrink-0">{metadataContainer}</div>
      <div className="flex-shrink-0">{actionContainer}</div>
    </div>
  );

  return (
    <ExpandableCard
      isExpanded={isExpanded}
      onToggleExpansion={onToggleExpansion}
      title={habitTitle}
      subtitle={habitSubtitle}
      subtitleAlign="between"
      className="w-full"
    >
      <div className="p-4 lg:p-6">
        <div className="w-full space-y-4">
          {effectiveStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-base-200 rounded-lg">
              <div className="text-center">
                <div className="text-xl  text-primary">
                  {effectiveStats.total_actions}
                </div>
                <div className="text-sm text-base-content/70">
                  {t("habits.stats.totalActions")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl  text-success">
                  {completionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-base-content/70">
                  {t("habits.stats.completionRate")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl  text-info">
                  {effectiveStats.current_streak}
                </div>
                <div className="text-sm text-base-content/70">
                  {t("habits.stats.currentStreak")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl  text-warning">
                  {effectiveStats.longest_streak}
                </div>
                <div className="text-sm text-base-content/70">
                  {t("habits.stats.longestStreak")}
                </div>
              </div>
            </div>
          )}

          {isExpanded && (
            <HabitActionList
              habitId={habit.id}
              habitTitle={habit.title}
              actions={actions || []}
              durationDays={habit.duration_days}
              startDate={habit.start_date}
              cadenceFrequency={habit.cadence_frequency}
              calendarAdapter={calendarAdapter}
              calendarSystem={calendarSystem}
              centerDate={actionCenterDate}
              onCenterDateChange={setActionCenterDate}
              onStatusUpdate={(habitId, action, newStatus) =>
                onStatusUpdate(habitId, action, newStatus)
              }
              onNotesChanged={() => {
                void actionsQuery.refetch();
              }}
            />
          )}
        </div>
      </div>
    </ExpandableCard>
  );
}

function HabitsPage() {
  const { t } = useTranslation();
  const { setHeader } = usePageHeader();
  const { adapter: calendarAdapter, calendarSystem } = useCalendarAdapter();
  const { areaMap } = useAreas();

  // All habits (no status filter) powering the filter-option counts
  const { habits: allHabits } = useAllHabits();

  // State; statusFilter undefined means "all"
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    "active",
  );
  const [areaFilter, setAreaFilter] = useState<UUID | null | undefined>(
    undefined,
  );
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [prefillHabit, setPrefillHabit] = useState<{
    title: string;
    description?: string | null;
    duration_days: number;
    task_id?: UUID | null;
    area_id?: UUID | null;
  } | null>(null);

  // Each facet applies the other facet before calculating its option counts.
  const habitsMatchingArea = useMemo(() => {
    return allHabits.filter((habit) => habitMatchesAreaFilter(habit, areaFilter));
  }, [allHabits, areaFilter]);

  const habitsMatchingStatus = useMemo(() => {
    if (statusFilter === undefined) {
      return allHabits;
    }
    return allHabits.filter((habit) => habit.status === statusFilter);
  }, [allHabits, statusFilter]);

  // Status filter options: "(n)" counts, sorted by count, "All" first.
  const statusOptions = useMemo(() => {
    const countsByStatus = new Map<string, number>();
    for (const habit of habitsMatchingArea) {
      countsByStatus.set(
        habit.status,
        (countsByStatus.get(habit.status) ?? 0) + 1,
      );
    }
    return buildCountedFilterOptions(
      HABIT_STATUS_FILTER_OPTIONS,
      countsByStatus,
      { allLabel: t("common.all"), totalCount: habitsMatchingArea.length },
    );
  }, [habitsMatchingArea, t]);

  // Area counts are keyed by option id, including __all__ and __none__.
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [SelectorSpecialValue.All]: habitsMatchingStatus.length,
    };
    let noneCount = 0;
    for (const habit of habitsMatchingStatus) {
      if (habit.area_id) {
        counts[habit.area_id] = (counts[habit.area_id] ?? 0) + 1;
      } else {
        noneCount += 1;
      }
    }
    counts[SelectorSpecialValue.None] = noneCount;
    return counts;
  }, [habitsMatchingStatus]);

  const {
    habits,
    isLoading,
    error,
    updateActionStatus,
    createHabit,
    updateHabit,
    expandedHabits,
    toggleHabitExpansion,
    deletingHabit,
    requestDeleteHabit,
    confirmDeleteHabit,
    cancelDeleteHabit,
  } = useHabitManager({
    statusFilter: statusFilter,
  });

  const visibleHabits = useMemo(() => {
    return habits.filter((habit) => habitMatchesAreaFilter(habit, areaFilter));
  }, [areaFilter, habits]);

  useEffect(() => {
    setHeader({
      actions: (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <AreaSelect
              value={areaFilter}
              onChange={(value) => setAreaFilter(value)}
              placeholder={t("common.all")}
              showAllOption
              showNoneOption
              noneLabel={t("habits.filters.areaNone")}
              showLabel={false}
              fullWidth={false}
              className="min-w-[180px]"
              id="habit-area-filter"
              optionCounts={areaCounts}
              sortByCount
            />
            <EnumSelect
              value={statusFilter ?? ALL_FILTER_VALUE}
              onChange={(value) =>
                setStatusFilter(
                  value === ALL_FILTER_VALUE ? undefined : (value as string),
                )
              }
              options={statusOptions}
              id="habit-status-filter"
              showLabel={false}
              autoWidth={false}
            />
          </div>

          <div className="flex items-center gap-2">
            <CreateNewButton
              label={t("common.create_new")}
              onClick={() => {
                setEditingHabit(null);
                setPrefillHabit(null);
                setShowFormModal(true);
              }}
            />
          </div>
        </div>
      ),
    });
    return () => setHeader({ actions: undefined });
  }, [
    setHeader,
    t,
    statusFilter,
    areaFilter,
    statusOptions,
    areaCounts,
  ]);


  const handleEditHabit = useCallback((habit: Habit) => {
    setPrefillHabit(null);
    setEditingHabit(habit);
    setShowFormModal(true);
  }, []);

  const handleCopyHabit = useCallback((habit: Habit) => {
    setEditingHabit(null);
    setPrefillHabit({
      title: habit.title,
      description: habit.description ?? null,
      duration_days: habit.duration_days,
      task_id: habit.task_id ?? null,
      area_id: habit.area_id ?? null,
    });
    setShowFormModal(true);
  }, []);

  const handleStatusUpdate = useCallback(
    async (habitId: UUID, action: HabitAction, newStatus: string) => {
      updateActionStatus(habitId, action, newStatus);
    },
    [updateActionStatus],
  );

  const handleCloseForm = useCallback(() => {
    setShowFormModal(false);
    setEditingHabit(null);
    setPrefillHabit(null);
  }, []);

  return (
    <PageLayout>
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorDisplay error={t("habits.errors.loadFailed")} />
      ) : (
        <>
          {visibleHabits.length === 0 ? (
            <EmptyState
              icon={
                <Icon
                  name="sparkles"
                  size={36}
                  className="text-primary"
                  aria-hidden
                />
              }
              title={t("habits.emptyState.title")}
              description={t("habits.emptyState.description")}
              actionText={t("common.create_new")}
              onAction={() => {
                setEditingHabit(null);
                setPrefillHabit(null);
                setShowFormModal(true);
              }}
            />
          ) : (
            <div className="space-y-4">
              {visibleHabits.map((habit) => (
                <HabitItem
                  key={habit.id}
                  habit={habit}
                  isExpanded={expandedHabits.has(habit.id)}
                  onToggleExpansion={() => toggleHabitExpansion(habit.id)}
                  onEdit={handleEditHabit}
                  onCopy={handleCopyHabit}
                  onStatusUpdate={handleStatusUpdate}
                  calendarAdapter={calendarAdapter}
                  calendarSystem={calendarSystem}
                  areaMap={areaMap}
                  t={t}
                />
              ))}
            </div>
          )}

          <HabitFormModal
            open={showFormModal}
            onClose={handleCloseForm}
            habitToEdit={editingHabit}
            prefillHabit={prefillHabit}
            onCreateHabit={createHabit}
            onUpdateHabit={updateHabit}
            onRequestDelete={requestDeleteHabit}
          />
          {deletingHabit && (
            <ConfirmDialog
              isOpen={!!deletingHabit}
              title={t("habits.confirmDelete.title")}
              message={t("habits.confirmDelete.message", {
                name: deletingHabit.title,
              })}
              confirmText={t("common.delete")}
              onConfirm={confirmDeleteHabit}
              onCancel={cancelDeleteHabit}
            />
          )}
        </>
      )}
    </PageLayout>
  );
}

export default HabitsPage;
