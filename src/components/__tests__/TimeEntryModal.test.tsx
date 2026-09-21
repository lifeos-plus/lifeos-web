import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Timelog } from "@/services/api";
import { renderWithProviders, setupTranslationMock } from "@test/utils";

const mocks = vi.hoisted(() => ({
  createTimelogAsync: vi.fn(),
  updateTimelogAsync: vi.fn(),
}));

setupTranslationMock();

vi.mock("@/hooks/queries/usePreferenceWithBootstrap", () => ({
  usePreferenceWithBootstrap: vi.fn((opts: { defaultValue: unknown }) => ({
    value:
      typeof opts.defaultValue === "string" ? "Asia/Shanghai" : opts.defaultValue,
    loading: false,
    error: null,
  })),
}));

vi.mock("@/hooks/useTimelogMutations", () => ({
  useTimelogMutations: () => ({
    createTimelogAsync: mocks.createTimelogAsync,
    updateTimelogAsync: mocks.updateTimelogAsync,
  }),
}));

vi.mock("@/components/selects/TaskSelector", () => ({
  __esModule: true,
  default: () => <input data-testid="task-selector" />,
}));

vi.mock("@/components/selects/AreaSelect", () => ({
  __esModule: true,
  default: () => <input data-testid="area-select" />,
}));

vi.mock("@/components/selects/PersonSelector", () => ({
  __esModule: true,
  default: () => <input data-testid="person-selector" />,
}));

vi.mock("@/layouts/ModalBase", () => ({
  __esModule: true,
  default: ({
    isOpen,
    error,
    children,
  }: {
    isOpen: boolean;
    error?: string | null;
    children?: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid="modal">
        {error ? <div role="alert">{error}</div> : null}
        {children}
      </div>
    ) : null,
}));

import TimeEntryModal from "@/components/TimeEntryModal";

const buildEntry = (overrides: Partial<Timelog> = {}): Timelog =>
  ({
    id: "timelog-1",
    title: "Deep work",
    start_time: "2026-07-02T08:30:00.000Z",
    end_time: "2026-07-02T09:00:00.000Z",
    area_id: null,
    energy_level: 3,
    notes: "",
    tracking_method: "manual",
    task_id: null,
    task: null,
    person: [],
    ...overrides,
  }) as unknown as Timelog;

const renderModal = (
  props: Partial<React.ComponentProps<typeof TimeEntryModal>> = {},
) =>
  renderWithProviders(
    <TimeEntryModal
      isOpen
      onClose={vi.fn()}
      onSave={vi.fn()}
      sessionId="session-1"
      selectedDate={new Date("2026-07-02T00:00:00.000Z")}
      {...props}
    />,
  );

const submitForm = () => {
  const form = document.querySelector("form");
  if (!form) throw new Error("Time entry form not found");
  fireEvent.submit(form);
};

describe("TimeEntryModal date editing", () => {
  beforeEach(() => {
    mocks.createTimelogAsync.mockResolvedValue({});
    mocks.updateTimelogAsync.mockResolvedValue({});
  });

  it("shows the existing entry start and end dates", async () => {
    renderModal({ entry: buildEntry() });

    expect(await screen.findByLabelText("timeLog.modal.startDate")).toHaveValue(
      "2026-07-02",
    );
    expect(screen.getByLabelText("timeLog.modal.endDate")).toHaveValue(
      "2026-07-02",
    );
  });

  it("keeps the start date when only the start time changes", async () => {
    renderModal({ entry: buildEntry() });

    fireEvent.change(await screen.findByLabelText("eventModal.fields.startTime"), {
      target: { value: "10:00" },
    });
    submitForm();

    await waitFor(() =>
      expect(mocks.updateTimelogAsync).toHaveBeenCalledTimes(1),
    );
    expect(mocks.updateTimelogAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "timelog-1",
        data: expect.objectContaining({
          start_time: "2026-07-02T02:00:00.000Z",
          end_time: "2026-07-02T09:00:00.000Z",
        }),
      }),
    );
  });

  it("moves an entry to another day when the start date changes", async () => {
    renderModal({ entry: buildEntry() });

    fireEvent.change(await screen.findByLabelText("timeLog.modal.startDate"), {
      target: { value: "2026-07-03" },
    });
    fireEvent.change(screen.getByLabelText("timeLog.modal.endDate"), {
      target: { value: "2026-07-03" },
    });
    submitForm();

    await waitFor(() =>
      expect(mocks.updateTimelogAsync).toHaveBeenCalledTimes(1),
    );
    expect(mocks.updateTimelogAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "timelog-1",
        data: expect.objectContaining({
          start_time: "2026-07-03T08:30:00.000Z",
          end_time: "2026-07-03T09:00:00.000Z",
        }),
      }),
    );
  });

  it("updates the end date independently of the start date", async () => {
    renderModal({ entry: buildEntry() });

    fireEvent.change(await screen.findByLabelText("timeLog.modal.endDate"), {
      target: { value: "2026-07-04" },
    });
    submitForm();

    await waitFor(() =>
      expect(mocks.updateTimelogAsync).toHaveBeenCalledTimes(1),
    );
    expect(mocks.updateTimelogAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "timelog-1",
        data: expect.objectContaining({
          start_time: "2026-07-02T08:30:00.000Z",
          end_time: "2026-07-04T09:00:00.000Z",
        }),
      }),
    );
  });

  it("keeps the end date when only the end time changes", async () => {
    renderModal({ entry: buildEntry() });

    fireEvent.change(await screen.findByLabelText("timeLog.modal.endTimeRequired"), {
      target: { value: "18:00" },
    });
    submitForm();

    await waitFor(() =>
      expect(mocks.updateTimelogAsync).toHaveBeenCalledTimes(1),
    );
    expect(mocks.updateTimelogAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "timelog-1",
        data: expect.objectContaining({
          start_time: "2026-07-02T08:30:00.000Z",
          end_time: "2026-07-02T10:00:00.000Z",
        }),
      }),
    );
  });

  it("blocks saving when the end is earlier than the start", async () => {
    renderModal({ entry: buildEntry() });

    fireEvent.change(await screen.findByLabelText("timeLog.modal.startDate"), {
      target: { value: "2026-07-05" },
    });
    submitForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "timeLog.modal.endBeforeStart",
    );
    expect(mocks.updateTimelogAsync).not.toHaveBeenCalled();
  });
});
