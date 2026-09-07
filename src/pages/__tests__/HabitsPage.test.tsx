import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { type ReactNode } from "react";

import { renderWithProviders, setupTranslationMock } from "@test/utils";
import type { Habit } from "@/services/api/habits";

const setHeaderMock = vi.fn();

type HabitActionMock = ReturnType<typeof vi.fn>;

interface HabitsHookResult {
  habits: Habit[];
  isLoading: boolean;
  error: Error | null;
  updateActionStatus: HabitActionMock;
  updateActionNotes: HabitActionMock;
  createHabit: HabitActionMock;
  updateHabit: HabitActionMock;
  expandedHabits: Set<Habit["id"]>;
  toggleHabitExpansion: HabitActionMock;
  deletingHabit: Habit | null;
  requestDeleteHabit: HabitActionMock;
  confirmDeleteHabit: HabitActionMock;
  cancelDeleteHabit: HabitActionMock;
}

function createHabitsResult(
  overrides: Partial<HabitsHookResult> = {},
): HabitsHookResult {
  const base: HabitsHookResult = {
    habits: [],
    isLoading: false,
    error: null,
    updateActionStatus: vi.fn(),
    updateActionNotes: vi.fn(),
    createHabit: vi.fn(),
    updateHabit: vi.fn(),
    expandedHabits: new Set(),
    toggleHabitExpansion: vi.fn(),
    deletingHabit: null,
    requestDeleteHabit: vi.fn(),
    confirmDeleteHabit: vi.fn(),
    cancelDeleteHabit: vi.fn(),
  };

  return { ...base, ...overrides };
}

const habitsState: {
  value: HabitsHookResult;
} = {
  value: createHabitsResult(),
};

const useHabitsMock = vi.fn(() => habitsState.value);

const {
  useHabitManagerOptionsRef,
  areaSelectPropsRef,
  allHabitsState,
} = vi.hoisted(() => ({
  useHabitManagerOptionsRef: { current: undefined as unknown },
  areaSelectPropsRef: { current: undefined as unknown },
  allHabitsState: { value: [] as Habit[] },
}));

vi.mock("@/contexts/PageHeaderContext", () => ({
  usePageHeader: () => ({
    setHeader: setHeaderMock,
  }),
}));

vi.mock("@/features/habits/controller/useHabitManager", () => ({
  useHabitManager: (options: unknown) => {
    useHabitManagerOptionsRef.current = options;
    return useHabitsMock();
  },
}));

vi.mock("@/hooks/queries/useAllHabits", () => ({
  useAllHabits: () => ({
    habits: allHabitsState.value,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/queries/useAreas", () => ({
  useAreas: () => ({
    areas: [],
    areaMap: new Map(),
    loading: false,
    error: null,
  }),
}));

vi.mock("@/components/selects/AreaSelect", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    areaSelectPropsRef.current = props;
    return <div data-testid="area-select" />;
  },
}));

vi.mock("@/components/selects/EnumSelect", () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    options,
  }: {
    value?: string | undefined | null;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select
      data-testid="habit-status-filter"
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/components/ActionButton", () => ({
  __esModule: true,
  default: ({
    onClick,
    children,
  }: {
    onClick?: () => void;
    children?: ReactNode;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  CreateNewButton: ({
    label,
    onClick,
  }: {
    label: string;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  ),
}));

vi.mock("@/components/habits/HabitFormModal", () => ({
  HabitFormModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="habit-form-modal" /> : null,
}));

vi.mock("@/components/habits/HabitActionList", () => ({
  HabitActionList: () => <div data-testid="habit-action-list" />,
}));

vi.mock("@/components/ExpandableCard", () => ({
  __esModule: true,
  default: ({
    title,
    subtitle,
    children,
  }: {
    title: ReactNode;
    subtitle?: ReactNode;
    children: ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
      <div>{children}</div>
    </div>
  ),
}));

import HabitsPage from "@/pages/HabitsPage";

describe("HabitsPage", () => {
  beforeEach(() => {
    setupTranslationMock();
    setHeaderMock.mockClear();
    useHabitsMock.mockImplementation(() => habitsState.value);
    habitsState.value = createHabitsResult();
    areaSelectPropsRef.current = undefined;
  });

  it("renders empty state when there are no habits", () => {
    habitsState.value = createHabitsResult({ habits: [] });

    renderWithProviders(<HabitsPage />);

    expect(screen.getByText("habits.emptyState.title")).toBeInTheDocument();
    expect(
      screen.getByText("habits.emptyState.description"),
    ).toBeInTheDocument();
    expect(setHeaderMock).toHaveBeenCalled();
  });

  it("renders habit cards when data exists", () => {
    const habit: Habit = {
      id: "habit-1" as Habit["id"],
      title: "Morning Planning",
      description: "Plan the day",
      status: "active",
      start_date: "2025-01-01",
      duration_days: 30,
      stats: {
        habit_id: "habit-1",
        total_actions: 10,
        completed_actions: 6,
        missed_actions: 2,
        skipped_actions: 2,
        progress_percentage: 50,
        current_streak: 3,
        longest_streak: 5,
      },
    };

    habitsState.value = createHabitsResult({ habits: [habit] });

    renderWithProviders(<HabitsPage />);

    expect(
      screen.queryByText("habits.emptyState.title"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Morning Planning/ }),
    ).toBeInTheDocument();
  });

  it("renders status filter with an all option and per-status counts", () => {
    allHabitsState.value = [
      { id: "h1", title: "A", status: "active", start_date: "2025-01-01", duration_days: 30 },
      { id: "h2", title: "B", status: "active", start_date: "2025-01-01", duration_days: 30 },
      { id: "h3", title: "C", status: "completed", start_date: "2025-01-01", duration_days: 30 },
    ] as unknown as Habit[];

    renderWithProviders(<HabitsPage />);

    const actions = setHeaderMock.mock.calls[0][0]
      .actions as ReactNode;
    const { getByRole } = render(
      <div>{actions}</div>,
    );
    const select = getByRole("combobox") as HTMLSelectElement;

    // "All" 选项在最前，其余按计数降序（不依赖具体翻译文本）
    const optionValues = Array.from(select.options).map((o) => o.value);
    const optionTexts = Array.from(select.options).map((o) => o.textContent);
    expect(optionValues).toEqual([
      "__all__",
      "active",
      "completed",
      "paused",
      "expired",
    ]);
    expect(optionTexts[0]).toBe("common.all (3)");
    expect(optionTexts.slice(1)).toEqual([
      expect.stringMatching(/^.+ \(2\)$/),
      expect.stringMatching(/^.+ \(1\)$/),
      expect.stringMatching(/^.+ \(0\)$/),
      expect.stringMatching(/^.+ \(0\)$/),
    ]);
    expect(select.value).toBe("active");
  });

  it("selecting the all option clears the status filter", () => {
    allHabitsState.value = [
      { id: "h1", title: "A", status: "active", start_date: "2025-01-01", duration_days: 30 },
    ] as unknown as Habit[];

    renderWithProviders(<HabitsPage />);

    const actions = setHeaderMock.mock.calls[0][0]
      .actions as ReactNode;
    const { getByRole } = render(
      <div>{actions}</div>,
    );
    const select = getByRole("combobox") as HTMLSelectElement;

    fireEvent.change(select, { target: { value: "__all__" } });

    expect(useHabitManagerOptionsRef.current).toEqual({
      statusFilter: undefined,
    });
  });

  it("builds status counts across all areas and area counts for the active status", () => {
    allHabitsState.value = [
      {
        id: "h1",
        title: "A",
        status: "active",
        area_id: "area-1",
        start_date: "2025-01-01",
        duration_days: 30,
      },
      {
        id: "h2",
        title: "B",
        status: "active",
        area_id: "area-1",
        start_date: "2025-01-01",
        duration_days: 30,
      },
      {
        id: "h3",
        title: "C",
        status: "completed",
        area_id: null,
        start_date: "2025-01-01",
        duration_days: 30,
      },
    ] as unknown as Habit[];

    renderWithProviders(<HabitsPage />);

    const actions = setHeaderMock.mock.calls[0][0]
      .actions as ReactNode;
    const { getByRole } = render(
      <div>{actions}</div>,
    );
    const select = getByRole("combobox") as HTMLSelectElement;

    const areaProps = areaSelectPropsRef.current as {
      value?: string | null;
      optionCounts: Record<string, number>;
      sortByCount: boolean;
      onChange: (value: string | undefined | null) => void;
    };
    expect(areaProps.optionCounts).toEqual({
      __all__: 2,
      __none__: 0,
      "area-1": 2,
    });
    expect(areaProps.sortByCount).toBe(true);
    expect(select.value).toBe("active");
    expect(select.options[0].textContent).toBe("common.all (3)");
  });

  it("updates status counts when the area filter changes", () => {
    allHabitsState.value = [
      {
        id: "h1",
        title: "A",
        status: "active",
        area_id: "area-1",
        start_date: "2025-01-01",
        duration_days: 30,
      },
      {
        id: "h2",
        title: "B",
        status: "completed",
        area_id: "area-2",
        start_date: "2025-01-01",
        duration_days: 30,
      },
      {
        id: "h3",
        title: "C",
        status: "completed",
        area_id: null,
        start_date: "2025-01-01",
        duration_days: 30,
      },
    ] as unknown as Habit[];

    renderWithProviders(<HabitsPage />);

    const actions = setHeaderMock.mock.calls[0][0]
      .actions as ReactNode;
    render(
      <div>{actions}</div>,
    );
    const areaProps = areaSelectPropsRef.current as {
      onChange: (value: string | undefined | null) => void;
    };

    act(() => {
      areaProps.onChange("area-2");
    });

    const latestActions = setHeaderMock.mock.calls.at(-1)?.[0]
      .actions as ReactNode;
    const view = render(<div>{latestActions}</div>);
    const select = view.getAllByRole("combobox").at(-1) as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      "__all__",
      "completed",
      "active",
      "paused",
      "expired",
    ]);
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      "common.all (1)",
      expect.stringMatching(/^.+ \(1\)$/),
      expect.stringMatching(/^.+ \(0\)$/),
      expect.stringMatching(/^.+ \(0\)$/),
      expect.stringMatching(/^.+ \(0\)$/),
    ]);
  });

  it("updates area counts when the status filter changes", () => {
    allHabitsState.value = [
      {
        id: "h1",
        title: "A",
        status: "active",
        area_id: "area-1",
        start_date: "2025-01-01",
        duration_days: 30,
      },
      {
        id: "h2",
        title: "B",
        status: "completed",
        area_id: null,
        start_date: "2025-01-01",
        duration_days: 30,
      },
    ] as unknown as Habit[];

    renderWithProviders(<HabitsPage />);

    const actions = setHeaderMock.mock.calls[0][0]
      .actions as ReactNode;
    const { getByRole } = render(
      <div>{actions}</div>,
    );
    const select = getByRole("combobox") as HTMLSelectElement;
    act(() => {
      fireEvent.change(select, { target: { value: "completed" } });
    });

    const latestActions = setHeaderMock.mock.calls.at(-1)?.[0]
      .actions as ReactNode;
    render(<div>{latestActions}</div>);

    const areaProps = areaSelectPropsRef.current as {
      optionCounts: Record<string, number>;
    };
    expect(areaProps.optionCounts).toEqual({
      __all__: 1,
      __none__: 1,
    });
  });
});
