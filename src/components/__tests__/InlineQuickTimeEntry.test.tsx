import React from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@test/utils";
import InlineQuickTimeEntry from "@/components/InlineQuickTimeEntry";

vi.mock("@/hooks/queries/useTimelogTemplates", () => {
  const templates = [
    {
      id: "tpl1",
      title: "Focus",
      area_id: "a1",
      area_name: null,
      default_duration_minutes: 30,
    },
    {
      id: "tpl2",
      title: "Read",
      area_id: null,
      area_name: "Reading",
      default_duration_minutes: null,
    },
  ];
  return {
    useTimelogTemplates: () => ({
      templates,
      bumpTemplateUsage: vi.fn(),
      loading: false,
    }),
  };
});

vi.mock("@/hooks/queries/useAreas", () => {
  const areas = [{ id: "a1", name: "Area 1" }];
  const areaMap = new Map([["a1", { id: "a1", name: "Area 1" }]]);
  return {
    useAreas: () => ({ areas, areaMap, loading: false }),
  };
});

vi.mock("@/hooks/queries/usePreferenceWithBootstrap", () => {
  const value = false;
  return {
    usePreferenceWithBootstrap: () => ({ value }),
  };
});

vi.mock("@/hooks/useTimelogMutations", () => {
  const createTimelogAsync = vi.fn();
  return {
    useTimelogMutations: () => ({ createTimelogAsync }),
  };
});

vi.mock("@/hooks/useTasksMutations", () => {
  const updateTaskAsync = vi.fn();
  return {
    useTasksMutations: () => ({ updateTaskAsync }),
  };
});

vi.mock("@/components/selects/TaskSelector", () => ({
  default: () => <input data-testid="task-selector" />,
}));

vi.mock("@/components/selects/AreaSelect", () => ({
  default: () => <input data-testid="area-select" />,
}));

vi.mock("@/components/selects/PersonSelector", () => ({
  default: () => <input data-testid="person-selector" />,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const templates: Record<string, string> = {
        "quickTimeEntry.templates.templateWithAreaDuration":
          "{{title}} (Area: {{area}}, Duration: {{duration}} min)",
        "quickTimeEntry.templates.templateWithArea": "{{title}} (Area: {{area}})",
      };
      const template = templates[key] ?? key;
      return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
        String(options?.[name] ?? ""),
      );
    },
    i18n: { changeLanguage: vi.fn(), language: "en" },
  }),
  Trans: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  initReactI18next: {
    type: "3rdParty",
    init: vi.fn(),
  },
}));

describe("InlineQuickTimeEntry", () => {
  it("renders template tooltips with area and duration info", () => {
    renderWithProviders(
      <InlineQuickTimeEntry
        selectedDate={new Date("2026-04-13T00:00:00Z")}
        startTime="09:00"
        endTime="10:00"
        onEntryCreated={vi.fn()}
        onError={vi.fn()}
        onCancel={vi.fn()}
        sessionId="session-1"
      />,
    );

    expect(
      document.querySelector('[title="Focus (Area: Area 1, Duration: 30 min)"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[title="Read (Area: Reading)"]'),
    ).not.toBeNull();
  });
});
