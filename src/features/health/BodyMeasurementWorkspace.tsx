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
  type BodyMeasurement,
  type BodyMeasurementCreate,
  type BodyMeasurementUpdate,
} from "@/services/api/health";
import { healthKeys } from "@/services/api/queryKeys";
import type { UUID } from "@/types/primitive";
import {
  formatDateTime,
  localDateTimeLocalToUtcIso,
  utcToLocalDateTimeLocal,
} from "@/utils/datetime";

import { formatWeight, WEIGHT_UNIT_OPTIONS } from "./utils";

interface BodyFormState {
  measuredAt: string;
  weight: string;
  unit: string;
  bodyFat: string;
  visceralFat: string;
  fatMass: string;
  musclePercentage: string;
  muscleMass: string;
  bodyWater: string;
  protein: string;
  boneMass: string;
  skeletalMuscle: string;
  notes: string;
}

const METRIC_FIELDS = [
  "bodyFat",
  "visceralFat",
  "fatMass",
  "musclePercentage",
  "muscleMass",
  "bodyWater",
  "protein",
  "boneMass",
  "skeletalMuscle",
] as const;

function emptyFormState(timezone: string): BodyFormState {
  return {
    measuredAt: utcToLocalDateTimeLocal(new Date().toISOString(), timezone),
    weight: "",
    unit: "kg",
    bodyFat: "",
    visceralFat: "",
    fatMass: "",
    musclePercentage: "",
    muscleMass: "",
    bodyWater: "",
    protein: "",
    boneMass: "",
    skeletalMuscle: "",
    notes: "",
  };
}

function formStateFromMeasurement(
  measurement: BodyMeasurement,
  timezone: string,
): BodyFormState {
  return {
    measuredAt: utcToLocalDateTimeLocal(measurement.measured_at, timezone),
    weight: String(measurement.weight_kg),
    unit: measurement.display_unit,
    bodyFat: measurement.body_fat_percentage === null ? "" : String(measurement.body_fat_percentage),
    visceralFat: measurement.visceral_fat === null ? "" : String(measurement.visceral_fat),
    fatMass: measurement.fat_mass_kg === null ? "" : String(measurement.fat_mass_kg),
    musclePercentage:
      measurement.muscle_percentage === null ? "" : String(measurement.muscle_percentage),
    muscleMass: measurement.muscle_mass_kg === null ? "" : String(measurement.muscle_mass_kg),
    bodyWater: measurement.body_water_kg === null ? "" : String(measurement.body_water_kg),
    protein: measurement.protein_kg === null ? "" : String(measurement.protein_kg),
    boneMass: measurement.bone_mass_kg === null ? "" : String(measurement.bone_mass_kg),
    skeletalMuscle:
      measurement.skeletal_muscle_kg === null ? "" : String(measurement.skeletal_muscle_kg),
    notes: measurement.notes ?? "",
  };
}

const METRIC_TO_FIELD: Record<(typeof METRIC_FIELDS)[number], keyof BodyMeasurement> = {
  bodyFat: "body_fat_percentage",
  visceralFat: "visceral_fat",
  fatMass: "fat_mass_kg",
  musclePercentage: "muscle_percentage",
  muscleMass: "muscle_mass_kg",
  bodyWater: "body_water_kg",
  protein: "protein_kg",
  boneMass: "bone_mass_kg",
  skeletalMuscle: "skeletal_muscle_kg",
};

function buildMetricPayload(
  form: BodyFormState,
): Partial<BodyMeasurementCreate> {
  return {
    body_fat_percentage: form.bodyFat.trim() ? Number(form.bodyFat) : null,
    visceral_fat: form.visceralFat.trim() ? Number(form.visceralFat) : null,
    fat_mass_kg: form.fatMass.trim() ? Number(form.fatMass) : null,
    muscle_percentage: form.musclePercentage.trim()
      ? Number(form.musclePercentage)
      : null,
    muscle_mass_kg: form.muscleMass.trim() ? Number(form.muscleMass) : null,
    body_water_kg: form.bodyWater.trim() ? Number(form.bodyWater) : null,
    protein_kg: form.protein.trim() ? Number(form.protein) : null,
    bone_mass_kg: form.boneMass.trim() ? Number(form.boneMass) : null,
    skeletal_muscle_kg: form.skeletalMuscle.trim()
      ? Number(form.skeletalMuscle)
      : null,
  };
}

function MetricInput({
  label,
  value,
  onChange,
  id,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
  placeholder?: string;
}) {
  return (
    <FormField label={label} htmlFor={id}>
      <TextInput
        id={id}
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}

export function BodyMeasurementWorkspace() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { timezone } = useSystemTimezone();
  const [formOpen, setFormOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurement | null>(null);
  const [form, setForm] = useState<BodyFormState>(() => emptyFormState(timezone));
  const [pendingDelete, setPendingDelete] = useState<BodyMeasurement | null>(null);

  const measurementsQuery = useQuery({
    queryKey: healthKeys.bodyMeasurementList(),
    queryFn: () => healthApi.listBodyMeasurements({ size: 100 }),
  });

  const measurements = useMemo(
    () => measurementsQuery.data?.items ?? [],
    [measurementsQuery.data?.items],
  );

  const invalidateMeasurements = async () => {
    await queryClient.invalidateQueries({ queryKey: healthKeys.bodyMeasurements() });
  };

  const createMutation = useMutation({
    mutationFn: (payload: BodyMeasurementCreate) => healthApi.createBodyMeasurement(payload),
    onSuccess: async () => {
      toast.showSuccess(t("health.body.messages.created"));
      setFormOpen(false);
      setForm(emptyFormState(timezone));
      await invalidateMeasurements();
    },
    onError: (error) => {
      toast.showError(t("common.error"), error instanceof Error ? error.message : String(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      measurementId,
      payload,
    }: {
      measurementId: UUID;
      payload: BodyMeasurementUpdate;
    }) => healthApi.updateBodyMeasurement(measurementId, payload),
    onSuccess: async () => {
      toast.showSuccess(t("health.body.messages.updated"));
      setFormOpen(false);
      setEditingMeasurement(null);
      await invalidateMeasurements();
    },
    onError: (error) => {
      toast.showError(t("common.error"), error instanceof Error ? error.message : String(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (measurementId: UUID) => healthApi.deleteBodyMeasurement(measurementId),
    onSuccess: async () => {
      toast.showSuccess(t("health.body.messages.deleted"));
      setPendingDelete(null);
      await invalidateMeasurements();
    },
    onError: (error) => {
      toast.showError(t("common.error"), error instanceof Error ? error.message : String(error));
    },
  });

  const openCreate = () => {
    setEditingMeasurement(null);
    setForm(emptyFormState(timezone));
    setFormOpen(true);
  };

  const openEdit = (measurement: BodyMeasurement) => {
    setEditingMeasurement(measurement);
    setForm(formStateFromMeasurement(measurement, timezone));
    setFormOpen(true);
  };

  const submitForm = () => {
    const weight = Number(form.weight);
    if (!form.measuredAt || !Number.isFinite(weight) || weight <= 0) return;
    const metricPayload = buildMetricPayload(form);
    const notes = form.notes.trim() || null;
    const measuredAt = localDateTimeLocalToUtcIso(form.measuredAt, timezone);

    if (editingMeasurement) {
      const clearFields: string[] = [];
      METRIC_FIELDS.forEach((key) => {
        const field = METRIC_TO_FIELD[key];
        if (
          form[key].trim() === "" &&
          editingMeasurement[field] !== null
        ) {
          clearFields.push(String(field));
        }
      });
      if (notes === null && editingMeasurement.notes !== null) {
        clearFields.push("notes");
      }
      const payload: BodyMeasurementUpdate = {
        measured_at: measuredAt,
        weight,
        unit: form.unit,
        ...metricPayload,
        notes,
        clear_fields: clearFields.length > 0 ? clearFields : null,
      };
      updateMutation.mutate({ measurementId: editingMeasurement.id, payload });
      return;
    }

    const payload: BodyMeasurementCreate = {
      measured_at: measuredAt,
      weight,
      unit: form.unit,
      ...metricPayload,
      notes,
    };
    createMutation.mutate(payload);
  };

  if (measurementsQuery.isLoading) {
    return <LoadingSpinner />;
  }
  if (measurementsQuery.error) {
    const error = measurementsQuery.error;
    return <ErrorDisplay error={error instanceof Error ? error.message : String(error)} />;
  }

  return (
    <div className="space-y-6">
      <ToolbarContainer padding="sm">
        <div className="flex flex-wrap items-center gap-2">
          <CreateNewButton
            label={t("health.body.addMeasurement")}
            onClick={openCreate}
            size="sm"
            color="primary"
            variant="solid"
          />
        </div>
      </ToolbarContainer>

      {measurements.length === 0 ? (
        <Surface padding="lg" border="dashed" elevation="moderate" className="text-center">
          <p className="opacity-70">{t("health.body.empty")}</p>
        </Surface>
      ) : (
        <Surface as="section" padding="md" elevation="moderate">
          <ul className="divide-y divide-base-200">
            {measurements.map((measurement) => (
              <li key={measurement.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {formatDateTime(measurement.measured_at, timezone)}
                    </span>
                    <span className="badge badge-sm badge-primary">
                      {formatWeight(measurement.weight_kg, measurement.display_unit)}
                    </span>
                    {measurement.body_fat_percentage !== null ? (
                      <span className="badge badge-sm badge-outline">
                        {t("health.body.bodyFat")} {measurement.body_fat_percentage}%
                      </span>
                    ) : null}
                    {measurement.visceral_fat !== null ? (
                      <span className="badge badge-sm badge-outline">
                        {t("health.body.visceralFat")} {measurement.visceral_fat}
                      </span>
                    ) : null}
                    {measurement.bmi !== null ? (
                      <span className="badge badge-sm badge-ghost">
                        BMI {measurement.bmi}
                      </span>
                    ) : null}
                  </div>
                  {measurement.notes ? (
                    <p className="mt-1 text-sm italic opacity-70">{measurement.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <ActionButton
                    label=""
                    ariaLabel={t("common.edit")}
                    iconName="edit"
                    iconOnly
                    shape="square"
                    size="xs"
                    variant="ghost"
                    onClick={() => openEdit(measurement)}
                  />
                  <ActionButton
                    label=""
                    ariaLabel={t("common.delete")}
                    iconName="trash"
                    iconOnly
                    shape="square"
                    size="xs"
                    variant="ghost"
                    color="error"
                    onClick={() => setPendingDelete(measurement)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      )}

      <ModalBase
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={
          editingMeasurement
            ? t("health.body.editTitle")
            : t("health.body.createTitle")
        }
        size="2xl"
        bodyOverflow="auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label={t("health.body.measuredAt")} htmlFor="body-measured-at" required>
              <TextInput
                id="body-measured-at"
                type="datetime-local"
                value={form.measuredAt}
                onChange={(event) => setForm({ ...form, measuredAt: event.target.value })}
              />
            </FormField>
            <FormField label={t("health.body.weight")} htmlFor="body-weight" required>
              <TextInput
                id="body-weight"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.weight}
                placeholder="63.5"
                onChange={(event) => setForm({ ...form, weight: event.target.value })}
              />
            </FormField>
            <FormField label={t("health.body.unit")} htmlFor="body-unit">
              <select
                id="body-unit"
                className="select select-sm"
                value={form.unit}
                onChange={(event) => setForm({ ...form, unit: event.target.value })}
              >
                {WEIGHT_UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricInput
              id="body-fat"
              label={t("health.body.bodyFat")}
              value={form.bodyFat}
              onChange={(value) => setForm({ ...form, bodyFat: value })}
            />
            <MetricInput
              id="body-visceral-fat"
              label={t("health.body.visceralFat")}
              value={form.visceralFat}
              onChange={(value) => setForm({ ...form, visceralFat: value })}
            />
            <MetricInput
              id="body-fat-mass"
              label={t("health.body.fatMass")}
              value={form.fatMass}
              onChange={(value) => setForm({ ...form, fatMass: value })}
            />
            <MetricInput
              id="body-muscle-percentage"
              label={t("health.body.musclePercentage")}
              value={form.musclePercentage}
              onChange={(value) => setForm({ ...form, musclePercentage: value })}
            />
            <MetricInput
              id="body-muscle-mass"
              label={t("health.body.muscleMass")}
              value={form.muscleMass}
              onChange={(value) => setForm({ ...form, muscleMass: value })}
            />
            <MetricInput
              id="body-water"
              label={t("health.body.bodyWater")}
              value={form.bodyWater}
              onChange={(value) => setForm({ ...form, bodyWater: value })}
            />
            <MetricInput
              id="body-protein"
              label={t("health.body.protein")}
              value={form.protein}
              onChange={(value) => setForm({ ...form, protein: value })}
            />
            <MetricInput
              id="body-bone-mass"
              label={t("health.body.boneMass")}
              value={form.boneMass}
              onChange={(value) => setForm({ ...form, boneMass: value })}
            />
            <MetricInput
              id="body-skeletal-muscle"
              label={t("health.body.skeletalMuscle")}
              value={form.skeletalMuscle}
              onChange={(value) => setForm({ ...form, skeletalMuscle: value })}
            />
          </div>

          <FormField label={t("health.common.notes")} htmlFor="body-notes">
            <textarea
              id="body-notes"
              className="textarea textarea-sm w-full"
              rows={2}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <ActionButton
              type="button"
              label={t("common.cancel")}
              variant="ghost"
              onClick={() => setFormOpen(false)}
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            <ActionButton
              type="submit"
              label={
                createMutation.isPending || updateMutation.isPending
                  ? t("common.saving")
                  : editingMeasurement
                    ? t("common.save")
                    : t("health.body.addMeasurement")
              }
              color="primary"
              variant="solid"
              iconName="check"
              disabled={
                !form.measuredAt ||
                !form.weight ||
                Number.isNaN(Number(form.weight)) ||
                Number(form.weight) <= 0 ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              onClick={submitForm}
            />
          </div>
        </div>
      </ModalBase>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t("health.body.deleteTitle")}
        message={t("health.body.deleteMessage", {
          measuredAt: pendingDelete
            ? formatDateTime(pendingDelete.measured_at, timezone)
            : "",
        })}
        confirmText={t("health.body.deleteConfirm")}
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
