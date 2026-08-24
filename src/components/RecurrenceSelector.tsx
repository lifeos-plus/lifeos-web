import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import EnumSelect from "./selects/EnumSelect";
import { Checkbox, TextInput } from "./forms";
import { FORM_LABEL_COMPACT_CLASS, FORM_LABEL_CLASS } from "./forms/styles";

interface CustomRecurrenceConfig {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  weekdays?: string[]; // For WEEKLY frequency
  monthDay?: number; // For MONTHLY frequency (day of month)
  monthWeekday?: { weekday: string; occurrence: number }; // For MONTHLY frequency (nth weekday)
  yearMonth?: number; // For YEARLY frequency
}

interface RecurrenceSelectorProps {
  value?: string; // Current RRULE string
  onChange: (rrule: string) => void;
  startDate?: Date; // Used for intelligent defaults
}

const RECURRENCE_PRESETS = [
  { preset: "none", rrule: "" },
  { preset: "daily", rrule: "FREQ=DAILY" },
  { preset: "weekly", rrule: "FREQ=WEEKLY" },
  { preset: "monthly", rrule: "FREQ=MONTHLY" },
  { preset: "yearly", rrule: "FREQ=YEARLY" },
  { preset: "weekdays", rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" },
];

// Weekday, month, and occurrence value lists; labels come from i18n catalogs.
const WEEKDAY_VALUES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const MONTH_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const OCCURRENCE_VALUES = ["1", "2", "3", "4", "-1"];

// JavaScript Date.getDay() order (Sunday first) mapped to weekdayShort keys.
const JS_DAY_KEYS = ["su", "mo", "tu", "we", "th", "fr", "sa"];

const BYDAY_PATTERN = /^([+-]?\d+)?(MO|TU|WE|TH|FR|SA|SU)$/;

export default function RecurrenceSelector({
  value = "",
  onChange,
  startDate,
}: RecurrenceSelectorProps) {
  const { t } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState("none");
  const [showCustom, setShowCustom] = useState(false);
  const [customConfig, setCustomConfig] = useState<CustomRecurrenceConfig>({
    frequency: "WEEKLY",
    interval: 1,
    weekdays: [],
  });

  useEffect(() => {
    if (value) {
      const matchingPreset = RECURRENCE_PRESETS.find(
        (preset) => preset.rrule === value,
      );
      if (matchingPreset) {
        setSelectedPreset(matchingPreset.preset);
        setShowCustom(false);
      } else {
        setSelectedPreset("custom");
        setShowCustom(true);
        parseRRuleToCustomConfig(value);
      }
    } else {
      setSelectedPreset("none");
      setShowCustom(false);
    }
  }, [value]);

  const parseRRuleToCustomConfig = (rrule: string) => {
    // This is a simplified parser - in production you might want a more robust solution
    const parts = rrule.split(";");
    const config: Partial<CustomRecurrenceConfig> = { interval: 1 };

    parts.forEach((part) => {
      const [key, val] = part.split("=");
      switch (key) {
        case "FREQ":
          config.frequency = val as CustomRecurrenceConfig["frequency"];
          break;
        case "INTERVAL":
          config.interval = parseInt(val);
          break;
        case "BYDAY":
          {
            const weekdays: string[] = [];
            const ordinalDays = val
              .split(",")
              .map((token) => BYDAY_PATTERN.exec(token.trim()))
              .filter((match): match is RegExpExecArray => match !== null);
            ordinalDays.forEach((match) => {
              const ordinal = match[1];
              const weekday = match[2];
              if (ordinal) {
                config.monthWeekday = {
                  occurrence: parseInt(ordinal, 10),
                  weekday,
                };
                return;
              }
              weekdays.push(weekday);
            });
            if (weekdays.length > 0) {
              config.weekdays = weekdays;
            }
          }
          break;
        case "BYMONTHDAY":
          config.monthDay = parseInt(val.split(",")[0] || "1", 10);
          break;
        case "BYMONTH":
          config.yearMonth = parseInt(val.split(",")[0] || "1", 10);
          break;
        // Add more parsing as needed
      }
    });

    setCustomConfig(config as CustomRecurrenceConfig);
  };

  const getIntelligentDescription = (preset: string): string => {
    if (!startDate) return t(`recurrence.${preset}`);

    switch (preset) {
      case "weekly":
        return t("recurrence.intelligentWeekly", {
          weekday: t(
            `recurrence.weekdayShort.${JS_DAY_KEYS[startDate.getDay()]}`,
          ),
        });
      case "monthly":
        return t("recurrence.intelligentMonthly", {
          day: startDate.getDate(),
        });
      case "yearly":
        return t("recurrence.intelligentYearly", {
          month: t(
            `recurrence.monthShort.${String(startDate.getMonth() + 1)}`,
          ),
          day: startDate.getDate(),
        });
      default:
        return t(`recurrence.${preset}`);
    }
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);

    if (preset === "custom") {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    const presetConfig = RECURRENCE_PRESETS.find((p) => p.preset === preset);
    if (presetConfig) {
      onChange(presetConfig.rrule);
    }
  };

  const generateCustomRRule = (config: CustomRecurrenceConfig): string => {
    let rrule = `FREQ=${config.frequency}`;

    if (config.interval && config.interval > 1) {
      rrule += `;INTERVAL=${config.interval}`;
    }

    if (
      config.frequency === "WEEKLY" &&
      config.weekdays &&
      config.weekdays.length > 0
    ) {
      rrule += `;BYDAY=${config.weekdays.join(",")}`;
    }

    if (config.frequency === "MONTHLY") {
      if (config.monthDay) {
        rrule += `;BYMONTHDAY=${config.monthDay}`;
      } else if (config.monthWeekday) {
        rrule += `;BYDAY=${config.monthWeekday.occurrence > 0 ? config.monthWeekday.occurrence : ""}${config.monthWeekday.weekday}`;
      }
    }

    if (config.frequency === "YEARLY" && config.yearMonth) {
      rrule += `;BYMONTH=${config.yearMonth}`;
    }

    return rrule;
  };

  const generateCustomDescription = (
    config: CustomRecurrenceConfig,
  ): string => {
    const hasInterval = config.interval > 1;
    const weekdayLabels = (config.weekdays ?? [])
      .map((wd) => t(`recurrence.weekdayShort.${wd.toLowerCase()}`))
      .join(t("recurrence.separator"));

    switch (config.frequency) {
      case "DAILY":
        return hasInterval
          ? t("recurrence.dailyN", { count: config.interval })
          : t("recurrence.daily");
      case "WEEKLY":
        if (config.weekdays && config.weekdays.length > 0) {
          return hasInterval
            ? t("recurrence.weeklyNOn", {
                count: config.interval,
                weekdays: weekdayLabels,
              })
            : t("recurrence.weeklyOn", { weekdays: weekdayLabels });
        }
        return hasInterval
          ? t("recurrence.weeklyN", { count: config.interval })
          : t("recurrence.weekly");
      case "MONTHLY":
        if (config.monthDay) {
          return hasInterval
            ? t("recurrence.monthlyNOnDay", {
                count: config.interval,
                day: config.monthDay,
              })
            : t("recurrence.monthlyOnDay", { day: config.monthDay });
        } else if (config.monthWeekday) {
          const weekdayLabel = t(
            `recurrence.weekdayShort.${config.monthWeekday.weekday.toLowerCase()}`,
          );
          const occurrenceLabel = t(
            `recurrence.occurrence.${String(config.monthWeekday.occurrence)}`,
          );
          return hasInterval
            ? t("recurrence.monthlyNOnOrdinal", {
                count: config.interval,
                ordinal: occurrenceLabel,
                weekday: weekdayLabel,
              })
            : t("recurrence.monthlyOnOrdinal", {
                ordinal: occurrenceLabel,
                weekday: weekdayLabel,
              });
        }
        return hasInterval
          ? t("recurrence.monthlyN", { count: config.interval })
          : t("recurrence.monthly");
      case "YEARLY":
        return hasInterval
          ? t("recurrence.yearlyN", { count: config.interval })
          : t("recurrence.yearly");
      default:
        return t("recurrence.custom");
    }
  };

  const handleCustomConfigChange = (
    updates: Partial<CustomRecurrenceConfig>,
  ) => {
    const newConfig = { ...customConfig, ...updates };
    setCustomConfig(newConfig);

    const rrule = generateCustomRRule(newConfig);
    onChange(rrule);
  };

  return (
    <div className="space-y-4">
      <div>
        <EnumSelect
          id="recurrence-preset-select"
          label={t("target.frequency")}
          value={selectedPreset}
          onChange={(v) => handlePresetChange(String(v))}
          options={[
            ...RECURRENCE_PRESETS.map((p) => ({
              value: p.preset,
              label: getIntelligentDescription(p.preset),
            })),
            { value: "custom", label: t("recurrence.customOption") },
          ]}
        />
      </div>

      {showCustom && (
        <div className="border-t border-base-300 pt-4 space-y-4">
          <h4 className="text-sm  text-base-content/70">
            {t("recurrence.customTitle")}
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <EnumSelect
                id="frequency-select"
                label={t("target.frequency")}
                value={customConfig.frequency}
                onChange={(v) =>
                  handleCustomConfigChange({
                    frequency: String(v) as CustomRecurrenceConfig["frequency"],
                  })
                }
                options={[
                  { value: "DAILY", label: t("recurrence.daily") },
                  { value: "WEEKLY", label: t("recurrence.weekly") },
                  { value: "MONTHLY", label: t("recurrence.monthly") },
                  { value: "YEARLY", label: t("recurrence.yearly") },
                ]}
              />
            </div>

            <div>
              <label
                htmlFor="interval"
                className={FORM_LABEL_COMPACT_CLASS}
              >
                {t("target.interval")}
              </label>
              <TextInput
                id="interval"
                name="interval"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(customConfig.interval)}
                onChange={(e) =>
                  handleCustomConfigChange({
                    interval: parseInt(e.target.value, 10) || 1,
                  })
                }
                size="sm"
              />
            </div>
          </div>

          {customConfig.frequency === "WEEKLY" && (
            <div>
              <label className={`${FORM_LABEL_CLASS} mb-2`}>
                {t("recurrence.selectWeekdays")}
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_VALUES.map((value) => (
                  <Checkbox
                    key={value}
                    id={`weekly-type-${value}`}
                    name="weeklyType"
                    checked={
                      customConfig.weekdays?.includes(value) || false
                    }
                    onCheckedChange={(checked) => {
                      const weekdays = customConfig.weekdays || [];
                      if (checked) {
                        handleCustomConfigChange({
                          weekdays: [...weekdays, value],
                        });
                        return;
                      }

                      handleCustomConfigChange({
                        weekdays: weekdays.filter((wd) => wd !== value),
                      });
                    }}
                    size="sm"
                    label={t(`recurrence.weekdayShort.${value.toLowerCase()}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {customConfig.frequency === "MONTHLY" && (
            <div>
              <label className={`${FORM_LABEL_CLASS} mb-2`}>
                {t("recurrence.repeatMethod")}
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    id="monthlyType-date"
                    type="radio"
                    name="monthlyType"
                    checked={!!customConfig.monthDay}
                    onChange={() => {
                      const day = startDate ? startDate.getDate() : 1;
                      handleCustomConfigChange({
                        monthDay: day,
                        monthWeekday: undefined,
                      });
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{t("recurrence.byDate")}</span>
                  <TextInput
                    id="monthDay"
                    name="monthDay"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(
                      customConfig.monthDay ||
                        (startDate ? startDate.getDate() : 1),
                    )}
                    onChange={(e) =>
                      handleCustomConfigChange({
                        monthDay: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    size="sm"
                    className="mx-1 w-16"
                    disabled={!customConfig.monthDay}
                  />
                  <span className="text-sm">{t("recurrence.dayUnitLabel")}</span>
                </label>

                <label className="flex items-center">
                  <input
                    id="monthlyType-weekday"
                    type="radio"
                    name="monthlyType"
                    checked={!!customConfig.monthWeekday}
                    onChange={() => {
                      handleCustomConfigChange({
                        monthDay: undefined,
                        monthWeekday: { weekday: "MO", occurrence: 1 },
                      });
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{t("recurrence.byWeekday")}</span>
                  <div className="mx-1 min-w-[110px]">
                    <EnumSelect
                      id="monthly-occurrence"
                      value={
                        customConfig.monthWeekday?.occurrence
                          ? String(customConfig.monthWeekday.occurrence)
                          : "1"
                      }
                      onChange={(v) =>
                        handleCustomConfigChange({
                          monthWeekday: {
                            ...customConfig.monthWeekday!,
                            occurrence:
                              typeof v === "number"
                                ? v
                                : parseInt(String(v)) || 1,
                          },
                        })
                      }
                      options={OCCURRENCE_VALUES.map((value) => ({
                        value,
                        label: t(`recurrence.occurrence.${value}`),
                      }))}
                    />
                  </div>
                  <div className="mx-1 min-w-[110px]">
                    <EnumSelect
                      id="monthly-weekday"
                      value={customConfig.monthWeekday?.weekday || "MO"}
                      onChange={(v) =>
                        handleCustomConfigChange({
                          monthWeekday: {
                            ...customConfig.monthWeekday!,
                            weekday: String(v),
                          },
                        })
                      }
                      options={WEEKDAY_VALUES.map((value) => ({
                        value,
                        label: t(`recurrence.weekdayShort.${value.toLowerCase()}`),
                      }))}
                    />
                  </div>
                </label>
              </div>
            </div>
          )}

          {customConfig.frequency === "YEARLY" && (
            <div>
              <EnumSelect
                id="yearly-month"
                label={t("target.month")}
                value={String(
                  customConfig.yearMonth ||
                    (startDate ? startDate.getMonth() + 1 : 1),
                )}
                onChange={(v) =>
                  handleCustomConfigChange({
                    yearMonth:
                      typeof v === "number" ? v : parseInt(String(v)) || 1,
                  })
                }
                options={MONTH_VALUES.map((value) => ({
                  value,
                  label: t(`recurrence.monthShort.${value}`),
                }))}
              />
            </div>
          )}
        </div>
      )}

      {selectedPreset !== "none" && selectedPreset !== "custom" && (
        <div className="text-sm bg-base-200 p-2 rounded">
          {t("recurrence.previewPrefix")}
          {getIntelligentDescription(selectedPreset)}
        </div>
      )}

      {showCustom && (
        <div className="text-sm bg-base-200 p-2 rounded">
          {t("recurrence.previewPrefix")}
          {generateCustomDescription(customConfig)}
        </div>
      )}
    </div>
  );
}
