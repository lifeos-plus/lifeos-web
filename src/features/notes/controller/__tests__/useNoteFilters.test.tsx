import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useNoteFilters } from "@/features/notes/controller/useNoteFilters";
import type { Note } from "@/types/newNotes";

const note = {
  id: "n1",
  content: "Note",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  person: [{ id: "p1", name: "Alice", display_name: "Alice" }],
} as unknown as Note;

describe("useNoteFilters", () => {
  it("filters notes by the selected person", async () => {
    const onLoadFilteredNotes = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useNoteFilters([note], null, onLoadFilteredNotes),
    );

    await act(async () => {
      await result.current.handlePersonClick({ id: "p1", name: "Alice" });
    });

    expect(result.current.filteredNotes).toHaveLength(1);
    expect(onLoadFilteredNotes).toHaveBeenCalledWith({ person_id: "p1" });
  });
});
