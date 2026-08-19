import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import ActionButton, { CreateNewButton } from "@/components/ActionButton";
import ConfirmDialog from "@/components/ConfirmDialog";
import ErrorDisplay from "@/components/ErrorDisplay";
import { FormField, TextInput } from "@/components/forms";
import LoadingSpinner from "@/components/LoadingSpinner";
import ToolbarContainer from "@/components/ToolbarContainer";
import { useToast } from "@/contexts/ToastContext";
import { useSystemTimezone } from "@/hooks/useSystemTimezone";
import ModalBase from "@/layouts/ModalBase";
import Surface from "@/layouts/Surface";
import {
  healthApi,
  type SleepSegment,
  type SleepSegmentCreate,
} from "@/services/api/health";
import { healthKeys } from "@/services/api/queryKeys";
import type { UUID } from "@/types/primitive";
import {
  formatDateTime,
  getTodayDateString,
  localDateTimeLocalToUtcIso,
} from "@/utils/datetime";

import { totalMinutesToHoursMinutes } from "./utils";

function shiftDate(dateString: string, days: number): string {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function SleepWorkspace() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { timezone } = useSystemTimezone();
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
  const [formOpen, setFormOpen] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SleepSegment | null>(null);

  const summaryQuery = useQuery({
    queryKey: healthKeys.sleepSummary({
      start_date: selectedDate,
      end_date: selectedDate,
    }),
    queryFn: () =>
      healthApi.listSleepSummaries({
        start_date: selectedDate,
        end_date: selectedDate,
      }),
  });

  const segmentsQuery = useQuery({
    queryKey: healthKeys.sleepSegmentList({ sleep_date: selectedDate }),
    queryFn: () => healthApi.listSleepSegments({ sleep_date: selectedDate, size: 100 }),
  });

  const summaries = useMemo(
    () => summaryQuery.data?.items ?? [],
    [summaryQuery.data?.items],
  );
  const segments = useMemo(
    () => segmentsQuery.data?.items ?? [],
    [segmentsQuery.data?.items],
  );
  const summary = summaries[0] ?? null;
  const { hours, minutes } = totalMinutesToHoursMinutes(summary?.total_minutes ?? 0);

  const invalidateSleep = async () => {
    await queryClient.invalidateQueries({ queryKey: healthKeys.all });
  };

  const createMutation = useMutation({
    mutationFn: (payload: SleepSegmentCreate) => healthApi.createSleepSegment(payload),
    onSuccess: async () => {
      toast.showSuccess(t("health.sleep.messages.created"));
      setFormOpen(false);
      setStartAt("");
      setEndAt("");
      await invalidateSleep();
    },
    onError: (error) => {
      toast.showError(t("common.error"), error instanceof Error ? error.message : String(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (segmentId: UUID) => healthApi.deleteSleepSegment(segmentId),
    onSuccess: async () => {
      toast.showSuccess(t("health.sleep.messages.deleted"));
      setPendingDelete(null);
      await invalidateSleep();
    },
    onError: (error) => {
      toast.showError(t("common.error"), error instanceof Error ? error.message : String(error));
    },
  });

  const submitForm = () => {
    if (!startAt || !endAt) return;
    createMutation.mutate({
      start_at: localDateTimeLocalToUtcIso(startAt, timezone),
      end_at: localDateTimeLocalToUtcIso(endAt, timezone),
    });
  };

  if (summaryQuery.isLoading || segmentsQuery.isLoading) {
    return <LoadingSpinner />;
  }
  if (summaryQuery.error || segmentsQuery.error) {
    const error = summaryQuery.error ?? segmentsQuery.error;
    return <ErrorDisplay error={error instanceof Error ? error.message : String(error)} />;
  }

  return (
    <div className="space-y-6">
      <ToolbarContainer padding="sm">
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            label=""
            ariaLabel={t("health.sleep.previousDay")}
            iconName="chevron-left"
            iconOnly
            shape="square"
            size="sm"
            variant="ghost"
            onClick={() => setSelectedDate((current) => shiftDate(current, -1))}
          />
          <TextInput
            aria-label={t("health.sleep.date")}
            type="date"
            className="w-40"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          <ActionButton
            label=""
            ariaLabel={t("health.sleep.nextDay")}
            iconName="chevron-right"
            iconOnly
            shape="square"
            size="sm"
            variant="ghost"
            onClick={() => setSelectedDate((current) => shiftDate(current, 1))}
          />
          <CreateNewButton
            label={t("health.sleep.addSegment")}
            onClick={() => setFormOpen(true)}
            size="sm"
            color="primary"
            variant="solid"
          />
        </div>
      </ToolbarContainer>

      {summary ? (
        <Surface as="section" padding="md" elevation="moderate">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm opacity-70">{t("health.sleep.totalDuration")}</p>
              <p className="text-xl font-semibold">
                {t("health.sleep.durationValue", { hours, minutes })}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-70">{t("health.sleep.segmentCount")}</p>
              <p className="text-xl font-semibold">{summary.segment_count}</p>
            </div>
            <div>
              <p className="text-sm opacity-70">{t("health.sleep.firstStart")}</p>
              <p className="text-sm">
                {summary.first_start_at
                  ? formatDateTime(summary.first_start_at, timezone)
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-70">{t("health.sleep.lastEnd")}</p>
              <p className="text-sm">
                {summary.last_end_at ? formatDateTime(summary.last_end_at, timezone) : "-"}
              </p>
            </div>
          </div>
        </Surface>
      ) : (
        <Surface padding="lg" border="dashed" elevation="moderate" className="text-center">
          <p className="opacity-70">{t("health.sleep.noSummary")}</p>
        </Surface>
      )}

      {segments.length === 0 ? (
        <Surface padding="lg" border="dashed" elevation="moderate" className="text-center">
          <p className="opacity-70">{t("health.sleep.empty")}</p>
        </Surface>
      ) : (
        <Surface as="section" padding="md" elevation="moderate">
          <ul className="divide-y divide-base-200">
            {segments.map((segment) => {
              const duration = totalMinutesToHoursMinutes(segment.duration_minutes);
              return (
                <li key={segment.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {formatDateTime(segment.start_at, timezone)} →{" "}
                      {formatDateTime(segment.end_at, timezone)}
                    </p>
                    <p className="text-sm opacity-70">
                      {t("health.sleep.durationValue", {
                        hours: duration.hours,
                        minutes: duration.minutes,
                      })}
                    </p>
                  </div>
                  <ActionButton
                    label=""
                    ariaLabel={t("common.delete")}
                    iconName="trash"
                    iconOnly
                    shape="square"
                    size="xs"
                    variant="ghost"
                    color="error"
                    onClick={() => setPendingDelete(segment)}
                  />
                </li>
              );
            })}
          </ul>
        </Surface>
      )}

      <ModalBase
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={t("health.sleep.createTitle")}
        size="md"
        bodyOverflow="auto"
      >
        <div className="space-y-4">
          <FormField label={t("health.sleep.startTime")} htmlFor="sleep-start" required>
            <TextInput
              id="sleep-start"
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </FormField>
          <FormField label={t("health.sleep.endTime")} htmlFor="sleep-end" required>
            <TextInput
              id="sleep-end"
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <ActionButton
              type="button"
              label={t("common.cancel")}
              variant="ghost"
              onClick={() => setFormOpen(false)}
              disabled={createMutation.isPending}
            />
            <ActionButton
              type="submit"
              label={
                createMutation.isPending
                  ? t("common.saving")
                  : t("health.sleep.addSegment")
              }
              color="primary"
              variant="solid"
              iconName="check"
              disabled={!startAt || !endAt || createMutation.isPending}
              onClick={submitForm}
            />
          </div>
        </div>
      </ModalBase>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t("health.sleep.deleteTitle")}
        message={t("health.sleep.deleteMessage")}
        confirmText={t("health.sleep.deleteConfirm")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteMutation.mutate(pendingDelete.id);
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
