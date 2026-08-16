import { localDateTimeLocalToUtcIso } from "@/utils/datetime";
import type { ProcessedEntry } from "@/utils/datetime";
import type {
  Timelog,
  TimelogTaskSummary,
} from "@/services/api/timelogs";
import type { PersonSummary } from "@/services/api/types/common";
import type { UUID } from "@/types/primitive";

import type { BulkImportRow } from "./parseBulkTimelogInput";

export interface EditableRow extends BulkImportRow {
  isManualEdit?: boolean;
}

const convertToUtcIso = (
  dateString: string,
  timeString: string,
  timezone: string,
): string => {
  return localDateTimeLocalToUtcIso(
    `${dateString}T${timeString}`,
    timezone,
  );
};

const buildTaskReference = (
  row: EditableRow,
  taskLookup: Map<UUID, TimelogTaskSummary>,
) =>
  row.taskId && taskLookup.get(row.taskId as UUID)
    ? taskLookup.get(row.taskId as UUID)!
    : row.taskId
      ? {
          id: row.taskId as UUID,
          content: row.taskId,
          vision_id: null,
          vision_summary: null,
        }
      : null;

export const buildProcessedEntry = (
  row: EditableRow,
  timezone: string,
  taskLookup: Map<UUID, TimelogTaskSummary>,
  personLookup: Map<UUID, PersonSummary>,
): ProcessedEntry => {
  const startIso = convertToUtcIso(row.date, row.startTime, timezone);
  const endIso = convertToUtcIso(row.endDate, row.endTime, timezone);
  const person = row.personIds.map((id) => {
    const uuid = id as UUID;
    const matched = personLookup.get(uuid);
    return { id: uuid, name: matched?.name ?? "" };
  });
  return {
    id: row.id as UUID,
    title: row.description,
    start_time: startIso,
    end_time: endIso,
    area_id: (row.areaId as UUID) ?? null,
    tracking_method: "manual",
    location: null,
    energy_level: row.energyLevel ?? null,
    notes: row.notes || null,
    tags: [],
    extra_data: { sourceLine: row.sourceLineNumber },
    created_at: startIso,
    updated_at: endIso,
    person,
    task: buildTaskReference(row, taskLookup),
    linked_notes: [],
    validationResult: {
      isValid: row.errors.length === 0,
      hasNegativeDuration: false,
      hasOverlaps: false,
      overlappingEntries: [],
    },
  };
};

export const buildDraftTimelog = (
  row: EditableRow,
  timezone: string,
  taskLookup: Map<UUID, TimelogTaskSummary>,
  personLookup: Map<UUID, PersonSummary>,
): Timelog => {
  const startIso = convertToUtcIso(row.date, row.startTime, timezone);
  const endIso = convertToUtcIso(row.endDate, row.endTime, timezone);
  const nowIso = new Date().toISOString();
  const person = row.personIds.map((id) => {
    const uuid = id as UUID;
    const matched = personLookup.get(uuid);
    return { id: uuid, name: matched?.name ?? "" };
  });
  return {
    id: row.id as UUID,
    title: row.description,
    start_time: startIso,
    end_time: endIso,
    area_id: (row.areaId as UUID) ?? null,
    area_summary: null,
    tracking_method: "manual",
    location: null,
    energy_level: row.energyLevel ?? null,
    notes: row.notes || null,
    tags: [],
    extra_data: { sourceLine: row.sourceLineNumber },
    created_at: nowIso,
    updated_at: nowIso,
    person,
    task: buildTaskReference(row, taskLookup),
    linked_notes: [],
  };
};
