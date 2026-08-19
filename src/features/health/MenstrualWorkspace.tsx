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
import ModalBase from "@/layouts/ModalBase";
import Surface from "@/layouts/Surface";
import {
  healthApi,
  type MenstrualDay,
  type MenstrualDayCreate,
  type MenstrualDayUpdate,
  type MenstrualFactor,
} from "@/services/api/health";
import { healthKeys } from "@/services/api/queryKeys";
import type { UUID } from "@/types/primitive";
import { formatDate } from "@/utils/datetime";

import {
  MENSTRUAL_FLOW_OPTIONS,
  MENSTRUAL_SYMPTOM_OPTIONS,
} from "./utils";

type TriState = "" | "yes" | "no";

interface MenstrualFormState {
  logDate: string;
  inPeriod: boolean;
  flow: string;
  symptoms: string[];
  customSymptom: string;
  moodChanges: TriState;
  protectionUsed: TriState;
  spotting: TriState;
  factorNames: string[];
  notes: string;
}

function emptyFormState(): MenstrualFormState {
  return {
    logDate: new Date().toISOString().slice(0, 10),
    inPeriod: false,
    flow: "",
    symptoms: [],
    customSymptom: "",
    moodChanges: "",
    protectionUsed: "",
    spotting: "",
    factorNames: [],
    notes: "",
  };
}

function formStateFromDay(day: MenstrualDay): MenstrualFormState {
  return {
    logDate: day.log_date,
    inPeriod: day.in_period,
    flow: day.flow_amount ?? "",
    symptoms: [...day.symptoms],
    customSymptom: "",
    moodChanges: day.mood_changes === null ? "" : day.mood_changes ? "yes" : "no",
    protectionUsed:
      day.protection_used === null ? "" : day.protection_used ? "yes" : "no",
    spotting: day.spotting === null ? "" : day.spotting ? "yes" : "no",
    factorNames: day.factors.map((factor) => factor.name),
    notes: day.notes ?? "",
  };
}

function triStateToBoolean(value: TriState): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function TriStateSelect({
  value,
  onChange,
  label,
  id,
}: {
  value: TriState;
  onChange: (value: TriState) => void;
  label: string;
  id: string;
}) {
  const { t } = useTranslation();
  return (
    <FormField label={label} htmlFor={id}>
      <select
        id={id}
        className="select select-sm"
        value={value}
        onChange={(event) => onChange(event.target.value as TriState)}
      >
        <option value="">{t("health.common.notRecorded")}</option>
        <option value="yes">{t("health.common.yes")}</option>
        <option value="no">{t("health.common.no")}</option>
      </select>
    </FormField>
  );
}

export function MenstrualWorkspace() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<MenstrualDay | null>(null);
  const [form, setForm] = useState<MenstrualFormState>(emptyFormState);
  const [pendingDelete, setPendingDelete] = useState<MenstrualDay | null>(null);
  const [factorsOpen, setFactorsOpen] = useState(false);
  const [newFactorName, setNewFactorName] = useState("");

  const daysQuery = useQuery({
    queryKey: healthKeys.menstrualDayList(),
    queryFn: () => healthApi.listMenstrualDays({ size: 200 }),
  });
  const factorsQuery = useQuery({
    queryKey: healthKeys.menstrualFactors(),
    queryFn: () => healthApi.listMenstrualFactors({ size: 200 }),
  });

  const days = useMemo(() => daysQuery.data?.items ?? [], [daysQuery.data?.items]);
  const factors = useMemo(
    () => factorsQuery.data?.items ?? [],
    [factorsQuery.data?.items],
  );
  const factorNames = useMemo(
    () => factors.map((factor) => factor.name),
    [factors],
  );

  const invalidateMenstrual = async () => {
    await queryClient.invalidateQueries({ queryKey: healthKeys.menstrualDays() });
  };

  const createMutation = useMutation({
    mutationFn: (payload: MenstrualDayCreate) => healthApi.createMenstrualDay(payload),
    onSuccess: async () => {
      toast.showSuccess(t("health.menstrual.messages.created"));
      setFormOpen(false);
      setForm(emptyFormState());
      await invalidateMenstrual();
    },
    onError: (error) => {
      toast.showError(t("common.error"), error instanceof Error ? error.message : String(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ dayId, payload }: { dayId: UUID; payload: MenstrualDayUpdate }) =>
      healthApi.updateMenstrualDay(dayId, payload),
    onSuccess: async () => {
      toast.showSuccess(t("health.menstrual.messages.updated"));
      setFormOpen(false);
      setEditingDay(null);
      await invalidateMenstrual();
    },
    onError: (error) => {
      toast.showError(t("common.error"), error instanceof Error ? error.message : String(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (dayId: UUID) => healthApi.deleteMenstrualDay(dayId),
    onSuccess: async () => {
      toast.showSuccess(t("health.menstrual.messages.deleted"));
      setPendingDelete(null);
      await invalidateMenstrual();
    },
    onError: (error) => {
      toast.showError(t("common.error"), error instanceof Error ? error.message : String(error));
    },
  });

  const createFactorMutation = useMutation({
    mutationFn: (name: string) => healthApi.createMenstrualFactor({ name }),
    onSuccess: async () => {
      toast.showSuccess(t("health.menstrual.messages.factorCreated"));
      setNewFactorName("");
      await queryClient.invalidateQueries({ queryKey: healthKeys.menstrualFactors() });
    },
    onError: (error) => {
      toast.showError(t("common.error"), error instanceof Error ? error.message : String(error));
    },
  });

  const deleteFactorMutation = useMutation({
    mutationFn: (factorId: UUID) => healthApi.deleteMenstrualFactor(factorId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: healthKeys.menstrualFactors() });
    },
    onError: (error) => {
      toast.showError(t("common.error"), error instanceof Error ? error.message : String(error));
    },
  });

  const openCreate = () => {
    setEditingDay(null);
    setForm(emptyFormState());
    setFormOpen(true);
  };

  const openEdit = (day: MenstrualDay) => {
    setEditingDay(day);
    setForm(formStateFromDay(day));
    setFormOpen(true);
  };

  const toggleSymptom = (symptom: string) => {
    setForm((current) => ({
      ...current,
      symptoms: current.symptoms.includes(symptom)
        ? current.symptoms.filter((item) => item !== symptom)
        : [...current.symptoms, symptom],
    }));
  };

  const addCustomSymptom = () => {
    const trimmed = form.customSymptom.trim();
    if (!trimmed || form.symptoms.includes(trimmed)) return;
    setForm((current) => ({
      ...current,
      symptoms: [...current.symptoms, trimmed],
      customSymptom: "",
    }));
  };

  const submitForm = () => {
    if (!form.logDate) return;
    const payload: MenstrualDayCreate = {
      log_date: form.logDate,
      in_period: form.inPeriod,
      flow_amount: form.inPeriod && form.flow ? form.flow : null,
      symptoms: form.symptoms,
      mood_changes: triStateToBoolean(form.moodChanges),
      protection_used: triStateToBoolean(form.protectionUsed),
      spotting: triStateToBoolean(form.spotting),
      factor_names: form.factorNames,
      notes: form.notes || null,
    };
    if (editingDay) {
      const update: MenstrualDayUpdate = {
        log_date: payload.log_date,
        in_period: payload.in_period,
        flow_amount: payload.flow_amount,
        symptoms: payload.symptoms,
        mood_changes: payload.mood_changes,
        protection_used: payload.protection_used,
        spotting: payload.spotting,
        factor_names: payload.factor_names,
        notes: payload.notes,
        clear_flow: form.inPeriod ? false : true,
        clear_symptoms: false,
        clear_notes: false,
        clear_factors: false,
      };
      updateMutation.mutate({ dayId: editingDay.id, payload: update });
      return;
    }
    createMutation.mutate(payload);
  };

  if (daysQuery.isLoading || factorsQuery.isLoading) {
    return <LoadingSpinner />;
  }
  if (daysQuery.error || factorsQuery.error) {
    const error = daysQuery.error ?? factorsQuery.error;
    return <ErrorDisplay error={error instanceof Error ? error.message : String(error)} />;
  }

  return (
    <div className="space-y-6">
      <ToolbarContainer padding="sm">
        <div className="flex flex-wrap items-center gap-2">
          <CreateNewButton
            label={t("health.menstrual.addDay")}
            onClick={openCreate}
            size="sm"
            color="primary"
            variant="solid"
          />
          <ActionButton
            label={t("health.menstrual.manageFactors")}
            iconName="tag"
            size="sm"
            variant="outline"
            onClick={() => setFactorsOpen(true)}
          />
        </div>
      </ToolbarContainer>

      {days.length === 0 ? (
        <Surface padding="lg" border="dashed" elevation="moderate" className="text-center">
          <p className="opacity-70">{t("health.menstrual.empty")}</p>
        </Surface>
      ) : (
        <Surface as="section" padding="md" elevation="moderate">
          <ul className="divide-y divide-base-200">
            {days.map((day) => (
              <li key={day.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{formatDate(day.log_date)}</span>
                    <span className={`badge badge-sm ${day.in_period ? "badge-error" : "badge-ghost"}`}>
                      {day.in_period
                        ? t("health.menstrual.inPeriod")
                        : t("health.menstrual.notInPeriod")}
                    </span>
                    {day.flow_amount ? (
                      <span className="badge badge-sm badge-outline">
                        {t(`health.menstrual.flow.${day.flow_amount}`)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-70">
                    {day.symptoms.length > 0 ? (
                      <span>
                        {t("health.menstrual.symptomsLabel")}: {day.symptoms.join(", ")}
                      </span>
                    ) : null}
                    {day.mood_changes !== null ? (
                      <span>
                        {t("health.menstrual.moodChanges")}:{" "}
                        {day.mood_changes ? t("health.common.yes") : t("health.common.no")}
                      </span>
                    ) : null}
                    {day.protection_used !== null ? (
                      <span>
                        {t("health.menstrual.protectionUsed")}:{" "}
                        {day.protection_used ? t("health.common.used") : t("health.common.unused")}
                      </span>
                    ) : null}
                    {day.spotting !== null ? (
                      <span>
                        {t("health.menstrual.spotting")}:{" "}
                        {day.spotting ? t("health.common.yes") : t("health.common.no")}
                      </span>
                    ) : null}
                    {day.factors.length > 0 ? (
                      <span>
                        {t("health.menstrual.factorsLabel")}:{" "}
                        {day.factors.map((factor) => factor.name).join(", ")}
                      </span>
                    ) : null}
                    {day.notes ? <span className="italic">{day.notes}</span> : null}
                  </div>
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
                    onClick={() => openEdit(day)}
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
                    onClick={() => setPendingDelete(day)}
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
          editingDay
            ? t("health.menstrual.editTitle")
            : t("health.menstrual.createTitle")
        }
        size="lg"
        bodyOverflow="auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t("health.menstrual.date")} htmlFor="menstrual-date" required>
              <TextInput
                id="menstrual-date"
                type="date"
                value={form.logDate}
                onChange={(event) => setForm({ ...form, logDate: event.target.value })}
              />
            </FormField>
            <FormField label={t("health.menstrual.flowAmount")} htmlFor="menstrual-flow">
              <select
                id="menstrual-flow"
                className="select select-sm"
                value={form.inPeriod ? form.flow : ""}
                disabled={!form.inPeriod}
                onChange={(event) => setForm({ ...form, flow: event.target.value })}
              >
                <option value="">{t("health.common.notRecorded")}</option>
                {MENSTRUAL_FLOW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={form.inPeriod}
              onChange={(event) => setForm({ ...form, inPeriod: event.target.checked })}
            />
            {t("health.menstrual.inPeriod")}
          </label>

          <FormField label={t("health.menstrual.symptoms")}>
            <div className="flex flex-wrap gap-2">
              {MENSTRUAL_SYMPTOM_OPTIONS.map((symptom) => (
                <label key={symptom} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={form.symptoms.includes(symptom)}
                    onChange={() => toggleSymptom(symptom)}
                  />
                  {t(`health.menstrual.symptom.${symptom}`)}
                </label>
              ))}
            </div>
          </FormField>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextInput
                aria-label={t("health.menstrual.customSymptom")}
                placeholder={t("health.menstrual.customSymptomPlaceholder")}
                value={form.customSymptom}
                onChange={(event) => setForm({ ...form, customSymptom: event.target.value })}
              />
            </div>
            <ActionButton
              label={t("health.menstrual.addSymptom")}
              iconName="plus"
              size="sm"
              variant="outline"
              onClick={addCustomSymptom}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TriStateSelect
              id="menstrual-mood"
              label={t("health.menstrual.moodChanges")}
              value={form.moodChanges}
              onChange={(value) => setForm({ ...form, moodChanges: value })}
            />
            <TriStateSelect
              id="menstrual-protection"
              label={t("health.menstrual.protectionUsed")}
              value={form.protectionUsed}
              onChange={(value) => setForm({ ...form, protectionUsed: value })}
            />
            <TriStateSelect
              id="menstrual-spotting"
              label={t("health.menstrual.spotting")}
              value={form.spotting}
              onChange={(value) => setForm({ ...form, spotting: value })}
            />
          </div>

          <FormField label={t("health.menstrual.factorsLabel")} htmlFor="menstrual-factors">
            <select
              id="menstrual-factors"
              className="select select-sm"
              multiple
              size={Math.min(factorNames.length + 1, 6)}
              value={form.factorNames}
              onChange={(event) =>
                setForm({
                  ...form,
                  factorNames: Array.from(event.target.selectedOptions, (option) => option.value),
                })
              }
            >
              {factorNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t("health.common.notes")} htmlFor="menstrual-notes">
            <textarea
              id="menstrual-notes"
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
                  : editingDay
                    ? t("common.save")
                    : t("health.menstrual.addDay")
              }
              color="primary"
              variant="solid"
              iconName="check"
              disabled={!form.logDate || createMutation.isPending || updateMutation.isPending}
              onClick={submitForm}
            />
          </div>
        </div>
      </ModalBase>

      <ModalBase
        isOpen={factorsOpen}
        onClose={() => setFactorsOpen(false)}
        title={t("health.menstrual.manageFactors")}
        size="md"
        bodyOverflow="auto"
      >
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextInput
                aria-label={t("health.menstrual.factorName")}
                placeholder={t("health.menstrual.factorNamePlaceholder")}
                value={newFactorName}
                onChange={(event) => setNewFactorName(event.target.value)}
              />
            </div>
            <ActionButton
              label={t("health.menstrual.addFactor")}
              iconName="plus"
              size="sm"
              variant="outline"
              disabled={!newFactorName.trim() || createFactorMutation.isPending}
              onClick={() => createFactorMutation.mutate(newFactorName.trim())}
            />
          </div>
          {factors.length === 0 ? (
            <p className="opacity-70">{t("health.menstrual.factorsEmpty")}</p>
          ) : (
            <ul className="divide-y divide-base-200">
              {factors.map((factor: MenstrualFactor) => (
                <li key={factor.id} className="flex items-center justify-between py-2">
                  <span className="text-sm">{factor.name}</span>
                  <ActionButton
                    label=""
                    ariaLabel={t("common.delete")}
                    iconName="trash"
                    iconOnly
                    shape="square"
                    size="xs"
                    variant="ghost"
                    color="error"
                    onClick={() => deleteFactorMutation.mutate(factor.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </ModalBase>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={t("health.menstrual.deleteTitle")}
        message={t("health.menstrual.deleteMessage", {
          date: pendingDelete ? formatDate(pendingDelete.log_date) : "",
        })}
        confirmText={t("health.menstrual.deleteConfirm")}
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
