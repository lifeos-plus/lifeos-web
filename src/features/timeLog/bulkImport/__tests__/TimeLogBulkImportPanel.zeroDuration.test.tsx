import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, setupTranslationMock } from "@test/utils";

const translation = setupTranslationMock();

const batchCreateMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useTimelogMutations", () => ({
  useTimelogMutations: () => ({ batchCreateTimelogsAsync: batchCreateMock }),
}));

vi.mock("@/hooks/queries/usePersonsList", () => ({
  usePersonsList: () => ({ persons: [] }),
}));

vi.mock("@/components/TimeEntriesTable", () => ({
  __esModule: true,
  default: ({
    entries,
    onEdit,
  }: {
    entries: Array<{ id: string }>;
    onEdit: (entry: { id: string }) => void;
  }) => (
    <div>
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onEdit(entry)}
        >
          edit-draft-row
        </button>
      ))}
    </div>
  ),
}));

type DraftSubmit = (payload: unknown) => Promise<void> | void;

const draftSubmitRef: { current: DraftSubmit | null } = { current: null };

vi.mock("@/components/TimeEntryModal", () => ({
  __esModule: true,
  default: (props: { onDraftSubmit?: DraftSubmit }) => {
    draftSubmitRef.current = props.onDraftSubmit ?? null;
    return <div data-testid="draft-modal" />;
  },
}));

import TimeLogBulkImportPanel from "@/features/timeLog/bulkImport/TimeLogBulkImportPanel";

const renderPanel = (onImported: () => void = vi.fn()) =>
  renderWithProviders(
    <TimeLogBulkImportPanel
      selectedDate={new Date("2026-08-15T00:00:00Z")}
      timezone="UTC"
      latestTimelogEndTime={null}
      areaMap={new Map()}
      preloadedTasks={[]}
      onCancel={vi.fn()}
      onImported={onImported}
    />,
  );

describe("TimeLogBulkImportPanel zero-length rows", () => {
  it("formats row errors that carry no interpolation metadata", async () => {
    renderPanel();

    fireEvent.change(
      screen.getByPlaceholderText("timeLog.bulkImport.inputPlaceholder"),
      { target: { value: "meeting notes" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "timeLog.bulkImport.parseButton",
      }),
    );

    await waitFor(() => {
      const rowErrorCall = translation.t.mock.calls.find(
        ([key, options]) =>
          typeof key === "string" &&
          key.startsWith("timeLog.bulkImport.errors.") &&
          typeof options === "object" &&
          options !== null,
      );
      expect(rowErrorCall).toBeDefined();
    });
  });

  it("keeps a zero-length row valid after it is edited in the draft modal", async () => {
    renderPanel();

    fireEvent.change(
      screen.getByPlaceholderText("timeLog.bulkImport.inputPlaceholder"),
      { target: { value: "10:00-10:00 冥想" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "timeLog.bulkImport.parseButton",
      }),
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "edit-draft-row" }),
    );

    expect(draftSubmitRef.current).not.toBeNull();
    await act(async () => {
      await draftSubmitRef.current?.({
        title: "冥想",
        start_time: "2026-08-15T10:00:00.000Z",
        end_time: "2026-08-15T10:00:00.000Z",
        area_id: null,
        person_ids: [],
      });
    });

    expect(
      screen.queryByText("timeLog.bulkImport.errorListTitle"),
    ).toBeNull();
  });

  it("keeps only failed rows when a batch import partially succeeds", async () => {
    const onImported = vi.fn();
    batchCreateMock.mockResolvedValue({
      created_count: 1,
      failed_count: 1,
      failed_indexes: [1],
      created_timelogs: [{}],
      errors: ["boom"],
    });

    renderPanel(onImported);

    fireEvent.change(
      screen.getByPlaceholderText("timeLog.bulkImport.inputPlaceholder"),
      { target: { value: "10:00-11:00 冥想\n11:00-12:00 阅读" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "timeLog.bulkImport.parseButton",
      }),
    );

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "edit-draft-row" })).toHaveLength(2),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "timeLog.bulkImport.submit" }),
    );

    await waitFor(() => expect(batchCreateMock).toHaveBeenCalledTimes(1));
    expect(batchCreateMock.mock.calls[0][0]).toHaveLength(2);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "edit-draft-row" })).toHaveLength(1),
    );
    expect(onImported).not.toHaveBeenCalled();
  });
});
