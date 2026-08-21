import { formatDuration } from "@/utils/datetime";

export const HEALTH_TABS = ["menstrual", "body", "sleep"] as const;
export type HealthTab = (typeof HEALTH_TABS)[number];
export const DEFAULT_HEALTH_TAB: HealthTab = "menstrual";
export const HEALTH_TOOLBAR_ORDER: readonly HealthTab[] = [
  "menstrual",
  "body",
  "sleep",
];

export const MENSTRUAL_FLOW_OPTIONS = [
  { value: "low", labelKey: "health.menstrual.flow.low" },
  { value: "medium", labelKey: "health.menstrual.flow.medium" },
  { value: "high", labelKey: "health.menstrual.flow.high" },
] as const;

export const MENSTRUAL_SYMPTOM_OPTIONS = [
  "hot_flash",
  "headache",
  "bladder_incontinence",
  "constipation",
] as const;

/**
 * Render one menstrual symptom for display: known symptom codes map to
 * translated labels, while user-entered custom symptoms pass through raw.
 */
export function displaySymptom(
  symptom: string,
  translate: (key: string) => string,
): string {
  const known = MENSTRUAL_SYMPTOM_OPTIONS as readonly string[];
  return known.includes(symptom) ? translate(`health.menstrual.symptom.${symptom}`) : symptom;
}

export const WEIGHT_UNIT_OPTIONS = ["kg", "jin", "lb"] as const;

const KG_PER_UNIT: Record<string, number> = {
  kg: 1,
  jin: 0.5,
  lb: 0.45359237,
};

export function formatWeight(weightKg: number, unit: string): string {
  const factor = KG_PER_UNIT[unit] ?? 1;
  const value = weightKg / factor;
  return `${value.toFixed(2)} ${unit}`;
}

export function formatMinutes(minutes: number): string {
  return formatDuration(minutes);
}

export function formatHourMinutes(hours: number, minutes: number): string {
  return `${hours}h ${minutes}m`;
}

export function totalMinutesToHoursMinutes(totalMinutes: number): {
  hours: number;
  minutes: number;
} {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}
