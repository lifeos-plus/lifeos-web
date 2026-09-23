import { act, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@test/utils";
import type { HabitActionWithHabit } from "@/services/api/habits";
import type { UUID } from "@/types/primitive";
import { SelectorSpecialValue } from "@/components/selects/selectorTypes";
import { HabitActionsCard } from "@/components/planning/HabitActionsCard";

const { areaSelectPropsRef } = vi.hoisted(() => ({
  areaSelectPropsRef: { current: undefined as unknown },
}));

vi.mock("@/components/selects/AreaSelect", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    areaSelectPropsRef.current = props;
    return <div data-testid="planning-area-select" />;
  },
}));

const createAction = (
  id: string,
  linkedNotesCount: number,
  areaId: string | null = id.startsWith("action-empty") ? "area-1" : null,
): HabitActionWithHabit => ({
  id: id as UUID,
  habit_id: "habit-1" as UUID,
  action_date: "2026-07-06",
  status: "pending",
  notes: null,
  linked_notes_count: linkedNotesCount,
  habit: {
    title: `Habit ${id}`,
    description: null,
    start_date: "2026-07-01",
    duration_days: 30,
    cadence_frequency: "weekly",
    area_id: areaId,
  },
});

describe("HabitActionsCard", () => {
  it("always renders related note buttons and subdues empty note collections", () => {
    renderWithProviders(
      <HabitActionsCard
        habitActions={[createAction("action-empty", 0), createAction("action-linked", 2)]}
        onStatusChange={vi.fn()}
      />,
    );

    const viewButtons = screen.getAllByRole("button", {
      name: "notes.actions.viewNotes",
    });

    expect(viewButtons).toHaveLength(2);
    expect(viewButtons[0]).toBeEnabled();
    expect(viewButtons[0].className).toContain("opacity-40");
    expect(viewButtons[1]).toBeEnabled();
    expect(viewButtons[1].className).not.toContain("opacity-40");
    expect(screen.getAllByTestId("planning-habit-action-row")[0]).not.toHaveTextContent(
      "common.expand",
    );
    expect(screen.getAllByTestId("planning-habit-action-layout")[0]).toHaveClass(
      "flex-col",
      "md:flex-row",
    );
  });

  it("filters habit actions by the inherited habit area", () => {
    renderWithProviders(
      <HabitActionsCard
        habitActions={[
          createAction("action-empty", 0),
          createAction("action-linked", 2),
        ]}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId("planning-habit-action-row")).toHaveLength(2);

    const areaProps = areaSelectPropsRef.current as {
      onChange: (value: string | undefined | null) => void;
    };
    act(() => {
      areaProps.onChange("area-1");
    });
    expect(screen.getAllByTestId("planning-habit-action-row")).toHaveLength(1);
    expect(screen.getByText("Habit action-empty")).toBeInTheDocument();

    act(() => {
      areaProps.onChange(null);
    });
    expect(screen.getAllByTestId("planning-habit-action-row")).toHaveLength(1);
    expect(screen.getByText("Habit action-linked")).toBeInTheDocument();
  });

  it("exposes per-area counts on the area filter options", () => {
    renderWithProviders(
      <HabitActionsCard
        habitActions={[
          createAction("action-a1", 0, "area-1"),
          createAction("action-a2", 0, "area-1"),
          createAction("action-b1", 0, "area-2"),
          createAction("action-no-area", 0, null),
        ]}
        onStatusChange={vi.fn()}
      />,
    );

    const areaProps = areaSelectPropsRef.current as {
      optionCounts: Record<string, number>;
      sortByCount: boolean;
    };
    expect(areaProps.optionCounts).toEqual({
      [SelectorSpecialValue.All]: 4,
      "area-1": 2,
      "area-2": 1,
      [SelectorSpecialValue.None]: 1,
    });
    expect(areaProps.sortByCount).toBe(true);
  });
});
