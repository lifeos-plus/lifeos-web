import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type ReactNode } from "react";

import { renderWithProviders, setupTranslationMock } from "@test/utils";
import type { Habit } from "@/services/api/habits";
import type { UUID } from "@/types/primitive";

const { areaSelectPropsRef } = vi.hoisted(() => ({
  areaSelectPropsRef: { current: undefined as unknown },
}));

vi.mock("@/components/selects/AreaSelect", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    areaSelectPropsRef.current = props;
    return <div data-testid="area-select" />;
  },
}));

vi.mock("@/components/selects/TaskSelector", () => ({
  __esModule: true,
  default: () => <div />,
}));

vi.mock("@/components/selects/EnumSelect", () => ({
  __esModule: true,
  default: () => <div />,
}));

vi.mock("@/components/forms", () => ({
  __esModule: true,
  FormField: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TextInput: (props: {
    id?: string;
    name?: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <input
      data-testid={props.id}
      id={props.id}
      name={props.name}
      value={props.value}
      onChange={props.onChange}
    />
  ),
  TextArea: () => <textarea />,
  CheckboxGroup: () => null,
  SegmentedControl: () => null,
}));

vi.mock("@/components/ActionButton", () => ({
  __esModule: true,
  DeleteButton: () => null,
  FormActions: () => null,
}));

vi.mock("@/layouts/ModalBase", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { HabitFormModal } from "@/components/habits/HabitFormModal";

const habitWithArea = {
  id: "habit-1" as UUID,
  title: "Morning Routine",
  description: null,
  status: "active",
  start_date: "2026-09-01",
  duration_days: 30,
  cadence_frequency: "daily",
  cadence_weekdays: null,
  cadence_monthdays: null,
  target_per_cycle: 1,
  task_id: null,
  area_id: "area-old" as UUID,
} as unknown as Habit;

describe("HabitFormModal", () => {
  beforeEach(() => {
    setupTranslationMock();
    areaSelectPropsRef.current = undefined;
  });

  it("sends the selected area when creating a habit", async () => {
    const onCreateHabit = vi.fn().mockResolvedValue(habitWithArea);
    const onClose = vi.fn();
    const { container } = renderWithProviders(
      <HabitFormModal
        open
        onClose={onClose}
        onCreateHabit={onCreateHabit}
      />,
    );

    const titleInput = container.querySelector<HTMLInputElement>("#title");
    expect(titleInput).not.toBeNull();
    fireEvent.change(titleInput as HTMLInputElement, {
      target: { value: "New habit" },
    });

    const areaProps = areaSelectPropsRef.current as {
      onChange: (value: string | undefined | null) => void;
    };
    act(() => {
      areaProps.onChange("area-new");
    });

    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(onCreateHabit).toHaveBeenCalled());
    expect(onCreateHabit.mock.calls[0][0]).toMatchObject({
      title: "New habit",
      area_id: "area-new",
    });
  });

  it("preserves the existing area when editing a habit", async () => {
    const onUpdateHabit = vi.fn().mockResolvedValue(habitWithArea);
    const onClose = vi.fn();
    const { container } = renderWithProviders(
      <HabitFormModal
        open
        onClose={onClose}
        habitToEdit={habitWithArea}
        onUpdateHabit={onUpdateHabit}
      />,
    );

    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(onUpdateHabit).toHaveBeenCalled());
    expect(onUpdateHabit.mock.calls[0][0]).toBe("habit-1");
    expect(onUpdateHabit.mock.calls[0][1]).toMatchObject({
      area_id: "area-old",
    });
  });

  it("renders an area selector", () => {
    renderWithProviders(
      <HabitFormModal open onClose={vi.fn()} habitToEdit={habitWithArea} />,
    );

    expect(screen.getByTestId("area-select")).toBeInTheDocument();
  });
});
