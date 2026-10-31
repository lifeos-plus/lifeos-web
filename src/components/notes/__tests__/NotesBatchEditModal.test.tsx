import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { setupTranslationMock } from "@test/utils";
import NotesBatchEditModal from "@/components/notes/NotesBatchEditModal";

const { submitBatchEdit } = vi.hoisted(() => ({
  submitBatchEdit: vi.fn(),
}));

vi.mock("@/layouts/ModalBase", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/notes/controller/useNotesBatchEditController", () => ({
  useNotesBatchEditController: () => ({
    isPending: false,
    submitBatchEdit,
  }),
}));

describe("NotesBatchEditModal", () => {
  beforeEach(() => {
    setupTranslationMock();
    submitBatchEdit.mockReset();
  });

  it("submits content-only replacement for the selected notes", () => {
    const notes = [
      { id: "note-1", content: "draft one" },
      { id: "note-2", content: "draft two" },
    ];

    render(
      <NotesBatchEditModal
        isOpen={true}
        onClose={vi.fn()}
        selectedNotes={notes}
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("notes.batchEdit.findText"), {
      target: { value: "draft" },
    });
    fireEvent.change(screen.getByLabelText("notes.batchEdit.replaceText"), {
      target: { value: "final" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "notes.batchEdit.caseSensitiveOff" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "notes.batchEdit.apply" }),
    );

    expect(submitBatchEdit).toHaveBeenCalledWith({
      notes,
      findText: "draft",
      replaceText: "final",
      caseSensitive: true,
    });
  });
});
