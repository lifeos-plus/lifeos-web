import { describe, expect, it } from "vitest";

import { MayanCalendarAdapter } from "@/utils/calendar";
import type { TaskWithSubtasks } from "@/services/api";

const createTask = (
  overrides: Partial<TaskWithSubtasks>,
): TaskWithSubtasks => ({
  id: overrides.id ?? "task-id",
  vision_id: null,
  parent_task_id: null,
  content: overrides.content ?? "Task",
  notes_count: 0,
  status: "todo",
  priority: 1,
  display_order: 0,
  estimated_effort: null,
  planning_cycle_type: overrides.planning_cycle_type ?? "day",
  planning_cycle_days: overrides.planning_cycle_days ?? 1,
  planning_cycle_start_date:
    overrides.planning_cycle_start_date ?? "2026-07-26",
  actual_effort_self: 0,
  actual_effort_total: 0,
  created_at: "2026-07-26T00:00:00Z",
  updated_at: "2026-07-26T00:00:00Z",
  deleted_at: null,
  person: [],
  subtasks: [],
  completion_percentage: 0,
  depth: 0,
});

describe("MayanCalendarAdapter", () => {
  const adapter = new MayanCalendarAdapter();

  it("uses July 26 as the year start and July 25 as Day Out of Time", () => {
    expect(adapter.getPeriodRange("year", new Date(2026, 6, 26))).toEqual({
      start: "2026-07-26",
      end: "2027-07-25",
    });
    expect(adapter.getPeriodRange("year", new Date(2026, 6, 25))).toEqual({
      start: "2025-07-26",
      end: "2026-07-25",
    });
    expect(adapter.getPeriodRange("7years", new Date(2026, 6, 26))).toEqual({
      start: "2025-07-26",
      end: "2032-07-25",
    });
    expect(adapter.getPeriodRange("month", new Date(2027, 6, 25))).toEqual({
      start: "2027-07-25",
      end: "2027-07-25",
    });
  });

  it("keeps leap days from shifting later moon and week boundaries", () => {
    expect(adapter.getPeriodRange("month", new Date(2028, 1, 29))).toEqual({
      start: "2028-02-07",
      end: "2028-03-06",
    });
    expect(adapter.getPeriodRange("week", new Date(2028, 6, 24))).toEqual({
      start: "2028-07-18",
      end: "2028-07-24",
    });
    expect(adapter.getPeriodRange("week", new Date(2028, 6, 25))).toEqual({
      start: "2028-07-25",
      end: "2028-07-25",
    });

    const [leapWeek] = adapter.buildPlanningGroups(
      "week",
      new Date(2028, 1, 29),
      [],
    );
    expect(leapWeek.children).toHaveLength(8);
    expect(leapWeek.children?.[0]?.date).toEqual(new Date(2028, 1, 28));
    expect(leapWeek.children?.[7]?.date).toEqual(new Date(2028, 2, 6));
  });

  it("derives physical planning duration from Mayan boundaries", () => {
    expect(adapter.getPlanningCycleDays("month", new Date(2028, 1, 29))).toBe(
      29,
    );
    expect(adapter.getPlanningCycleDays("week", new Date(2028, 1, 29))).toBe(
      8,
    );
    expect(adapter.getPlanningCycleDays("week", new Date(2028, 6, 25))).toBe(
      1,
    );
    expect(adapter.getPlanningCycleDays("year", new Date(2027, 6, 26))).toBe(
      366,
    );
  });

  it("calculates Mayan days independently of daylight-saving transitions", () => {
    expect(adapter.getPeriodRange("week", new Date(2026, 3, 1))).toEqual({
      start: "2026-03-28",
      end: "2026-04-03",
    });
  });

  it("builds 28-day moon and fixed seven-day week ranges", () => {
    expect(adapter.getPeriodRange("month", new Date(2026, 6, 26))).toEqual({
      start: "2026-07-26",
      end: "2026-08-22",
    });
    expect(adapter.getPeriodRange("week", new Date(2026, 7, 2))).toEqual({
      start: "2026-08-02",
      end: "2026-08-08",
    });
  });

  it("skips the Day Out of Time when navigating weeks", () => {
    // Backward from week 1 lands on week 52, never on the single-day period.
    expect(
      adapter.shiftPeriodRange(
        "week",
        "2026-07-26",
        "2026-08-01",
        -1,
      ),
    ).toEqual({
      start: "2026-07-18",
      end: "2026-07-24",
    });
    expect(
      adapter.shiftPeriodRange(
        "week",
        "2026-07-25",
        "2026-07-25",
        -1,
      ),
    ).toEqual({
      start: "2026-07-18",
      end: "2026-07-24",
    });
    // Two real weeks forward from week 52 advance to week 2.
    expect(
      adapter.shiftPeriodRange(
        "week",
        "2026-07-18",
        "2026-07-24",
        2,
      ),
    ).toEqual({
      start: "2026-08-02",
      end: "2026-08-08",
    });
  });

  it("skips the Day Out of Time when navigating months", () => {
    // Forward from moon 13 lands on moon 1 of the next year.
    expect(
      adapter.shiftPeriodRange(
        "month",
        "2026-06-27",
        "2026-07-24",
        1,
      ),
    ).toEqual({
      start: "2026-07-26",
      end: "2026-08-22",
    });
    expect(
      adapter.shiftPeriodRange(
        "month",
        "2026-07-25",
        "2026-07-25",
        1,
      ),
    ).toEqual({
      start: "2026-07-26",
      end: "2026-08-22",
    });
  });

  it("shows cycle-matched tasks on Day Out of Time", () => {
    const monthTask = createTask({
      id: "month-task",
      planning_cycle_type: "month",
      planning_cycle_days: 1,
      planning_cycle_start_date: "2026-07-25",
    });
    const overlappingMonthTask = createTask({
      id: "overlapping-month-task",
      planning_cycle_type: "month",
      planning_cycle_days: 2,
      planning_cycle_start_date: "2026-07-24",
    });
    const weekTask = createTask({
      id: "week-task",
      planning_cycle_type: "week",
      planning_cycle_days: 1,
      planning_cycle_start_date: "2026-07-25",
    });
    const dayTask = createTask({
      id: "day-task",
      planning_cycle_type: "day",
      planning_cycle_days: 1,
      planning_cycle_start_date: "2026-07-25",
    });
    const otherYearDayTask = createTask({
      id: "other-year-day-task",
      planning_cycle_type: "day",
      planning_cycle_days: 1,
      planning_cycle_start_date: "2027-07-25",
    });
    const tasks = [
      monthTask,
      overlappingMonthTask,
      weekTask,
      dayTask,
      otherYearDayTask,
    ];

    const [monthGroup] = adapter.buildPlanningGroups(
      "month",
      new Date(2026, 6, 25),
      tasks,
    );
    const [weekGroup] = adapter.buildPlanningGroups(
      "week",
      new Date(2026, 6, 25),
      tasks,
    );
    const [dayGroup] = adapter.buildPlanningGroups(
      "day",
      new Date(2026, 6, 25),
      tasks,
    );

    expect(monthGroup.tasks.map((task) => task.id)).toEqual([
      "month-task",
      "overlapping-month-task",
    ]);
    expect(weekGroup.tasks.map((task) => task.id)).toEqual(["week-task"]);
    expect(dayGroup.tasks.map((task) => task.id)).toEqual(["day-task"]);
  });

  it("uses calendar boundaries for planning period navigation", () => {
    // Week/month navigation skips the Day Out of Time: previous week from
    // week 1 is week 52, and next month from moon 13 is moon 1.
    expect(adapter.getPreviousPeriod(new Date(2026, 6, 26), "week")).toEqual(
      new Date(2026, 6, 18),
    );
    expect(adapter.getNextPeriod(new Date(2026, 6, 25), "week")).toEqual(
      new Date(2026, 6, 26),
    );
    expect(adapter.getNextPeriod(new Date(2026, 6, 24), "month")).toEqual(
      new Date(2026, 6, 26),
    );
  });

  it("classifies date-only planning tasks in local Mayan periods", () => {
    const weekTask = createTask({
      id: "week-task",
      planning_cycle_type: "week",
    });
    const dayTask = createTask({
      id: "day-task",
      planning_cycle_type: "day",
    });

    const [weekGroup] = adapter.buildPlanningGroups(
      "week",
      new Date(2026, 6, 28),
      [weekTask, dayTask],
    );

    expect(weekGroup.tasks.map((task) => task.id)).toEqual(["week-task"]);
    expect(weekGroup.children?.[0]?.tasks.map((task) => task.id)).toEqual([
      "day-task",
    ]);
  });

  it("enumerates thirteen moon options for a Mayan year", () => {
    const options = adapter.getMonthOptions(new Date(2026, 6, 26));

    expect(options).toHaveLength(13);
    expect(options[0]).toEqual({
      index: 1,
      name: "1 2026-07-26",
    });
    expect(options[12]).toEqual({
      index: 13,
      name: "13 2027-06-27",
    });
  });

  it("anchors 7-year ranges to the configured anchor year", () => {
    const anchoredAdapter = new MayanCalendarAdapter(1, 2026);

    expect(anchoredAdapter.getPeriodRange("7years", new Date(2026, 6, 26))).toEqual({
      start: "2026-07-26",
      end: "2033-07-25",
    });
    expect(anchoredAdapter.getPeriodRange("7years", new Date(2025, 6, 25))).toEqual({
      start: "2019-07-26",
      end: "2026-07-25",
    });
  });

  it("returns the out-of-time day label", () => {
    const adapter = new MayanCalendarAdapter();

    expect(adapter.getSpecialDayName(new Date("2024-07-26T00:00:00Z"))).toBeTruthy();
  });
});

describe("MayanCalendarAdapter with custom new year start", () => {
  const customAdapter = new MayanCalendarAdapter(1, 2025, "03-01");

  it("uses the configured month-day as year start and Day Out of Time", () => {
    expect(
      customAdapter.getPeriodRange("year", new Date(2028, 1, 28)),
    ).toEqual({
      start: "2027-03-01",
      end: "2028-02-29",
    });
    expect(
      customAdapter.getPeriodRange("month", new Date(2028, 1, 28)),
    ).toEqual({
      start: "2028-02-28",
      end: "2028-02-28",
    });
    expect(
      customAdapter.getPeriodRange("week", new Date(2028, 1, 28)),
    ).toEqual({
      start: "2028-02-28",
      end: "2028-02-28",
    });
    expect(
      customAdapter.getPeriodRange("7years", new Date(2028, 2, 1)),
    ).toEqual({
      start: "2025-03-01",
      end: "2032-02-29",
    });
  });

  it("treats February 29 as the Day Out of Time", () => {
    expect(
      customAdapter.getPeriodRange("month", new Date(2028, 1, 29)),
    ).toEqual({
      start: "2028-02-29",
      end: "2028-02-29",
    });
  });

  it("normalizes a February 29 new year start to February 28", () => {
    const leapBirthdayAdapter = new MayanCalendarAdapter(1, 2025, "02-29");

    expect(
      leapBirthdayAdapter.getPeriodRange("year", new Date(2027, 1, 28)),
    ).toEqual({
      start: "2027-02-28",
      end: "2028-02-27",
    });
  });

  it("places the Day Out of Time node on the configured date in year groups", () => {
    const [yearGroup] = customAdapter.buildPlanningGroups(
      "year",
      new Date(2028, 1, 28),
      [],
    );
    const dayOutOfTimeNode = yearGroup.children!.at(-1)!;

    expect(dayOutOfTimeNode.id).toBe("mayan-day-out-of-time-2027");
    expect(dayOutOfTimeNode.date).toEqual(new Date(2028, 1, 28));
  });

  it("derives display year and year selection from the configured new year start", () => {
    expect(customAdapter.getDisplayYear("2028-03-01")).toBe(2028);
    expect(customAdapter.getDisplayYear("2028-01-15")).toBe(2027);
    expect(customAdapter.getDateForYearSelection(2028)).toEqual(
      new Date(2028, 2, 1),
    );
  });
});

describe("MayanCalendarAdapter display helpers with default new year start", () => {
  const adapter = new MayanCalendarAdapter();

  it("keeps the legacy July 26 display behavior", () => {
    expect(adapter.getDisplayYear("2026-07-26")).toBe(2026);
    expect(adapter.getDateForYearSelection(2026)).toEqual(new Date(2026, 6, 26));
  });
});
