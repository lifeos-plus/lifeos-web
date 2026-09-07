import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EntryRow from "@/components/EntryRow";
import type { UUID } from "@/types/primitive";
import type { ProcessedEntry } from "@/utils/datetime";
import { renderWithProviders } from "@test/utils";

const baseEntry = (): ProcessedEntry => ({
  id: "entry-1" as UUID,
  title: "Deep work",
  start_time: "2026-08-10T02:00:00.000Z",
  end_time: "2026-08-10T03:00:00.000Z",
  area_id: null,
  tracking_method: "manual",
  created_at: "2026-08-10T02:00:00.000Z",
  updated_at: "2026-08-10T02:00:00.000Z",
  person: [],
  tags: [],
  extra_data: null,
  task: null,
  linked_notes: [],
  linked_notes_count: 0,
  isPlaceholder: false,
});

const renderRow = (entry: ProcessedEntry) =>
  renderWithProviders(
    <table>
      <tbody>
        <EntryRow
          entry={entry}
          index={0}
          isSelectMode={false}
          selected={false}
          onSelectChange={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onPlaceholderClick={vi.fn()}
          onCreateNote={vi.fn()}
          onViewNotes={vi.fn()}
          areaMap={new Map()}
          selectedDate={new Date("2026-08-10T00:00:00.000Z")}
          queryMode="single"
        />
      </tbody>
    </table>,
  );

describe("EntryRow linked-notes icon", () => {
  it("lights up when the backend reports linked_notes_count > 0", () => {
    renderRow({ ...baseEntry(), linked_notes: [], linked_notes_count: 1 });

    const viewNotesButton = screen.getByRole("button", {
      name: "notes.actions.viewNotes",
    });
    expect(viewNotesButton).toHaveClass("btn-primary");
    expect(viewNotesButton).not.toHaveClass("opacity-40");
  });

  it("lights up when only a local linked_notes list is present", () => {
    renderRow({
      ...baseEntry(),
      linked_notes: [
        {
          id: "note-1" as UUID,
          content: "A related note",
          created_at: "2026-08-10T01:00:00.000Z",
          updated_at: "2026-08-10T01:00:00.000Z",
        },
      ],
      linked_notes_count: 0,
    });

    const viewNotesButton = screen.getByRole("button", {
      name: "notes.actions.viewNotes",
    });
    expect(viewNotesButton).toHaveClass("btn-primary");
  });

  it("keeps the icon subdued when there are no related notes", () => {
    renderRow({ ...baseEntry(), linked_notes: [], linked_notes_count: 0 });

    const viewNotesButton = screen.getByRole("button", {
      name: "notes.actions.viewNotes",
    });
    expect(viewNotesButton).toHaveClass("btn-neutral", "opacity-40");
  });
});
