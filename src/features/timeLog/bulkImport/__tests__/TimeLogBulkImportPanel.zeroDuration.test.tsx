import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders, setupTranslationMock } from "@test/utils";

setupTranslationMock();

vi.mock("@/hooks/useTimelogMutations", () => ({
  useTimelogMutations: () => ({ batchCreateTimelogsAsync: vi.fn() }),
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

const renderPanel = () =>
  renderWithProviders(
    <TimeLogBulkImportPanel
      selectedDate={new Date("2026-08-15T00:00:00Z")}
      timezone="UTC"
      latestTimelogEndTime={null}
      areaMap={new Map()}
      preloadedTasks={[]}
      onCancel={vi.fn()}
      onImported={vi.fn()}
    />,
  );

describe("TimeLogBulkImportPanel zero-length rows", () => {
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
});
