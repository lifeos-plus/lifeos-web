import { fireEvent, waitFor, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import TaskNotesModal from "@/components/TaskNotesModal";
import { ModalProvider } from "@/contexts/ModalProvider";
import { ENDPOINTS } from "@/services/api/endpoints";
import type { NoteHabitActionSummary } from "@/services/api/notes";
import { renderWithProviders } from "@test/utils";
import type { UUID } from "@/types/primitive";

vi.mock("@/hooks/notes/useNoteCollapsePreference", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/hooks/notes/useNoteCollapsePreference")
    >();
  return {
    ...actual,
    useNoteCollapsePreference: () => ({ value: 3 }),
  };
});

const WithModalProvider = ({ children }: PropsWithChildren) => (
  <ModalProvider>{children}</ModalProvider>
);

const makeNote = (id: string, content: string) => ({
  id: id as UUID,
  content,
  created_at: "2026-07-06T01:00:00Z",
  updated_at: "2026-07-06T01:00:00Z",
});

describe("TaskNotesModal habit aggregation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads all habit notes without offering direct habit-note creation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            items: [],
            pagination: { page: 1, size: 50, total: 0, pages: 0 },
            meta: { habit_id: "habit-1" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    renderWithProviders(
      <TaskNotesModal
        isOpen
        onClose={vi.fn()}
        entityType="habit"
        habit={{ id: "habit-1" as UUID, title: "Morning Walk" }}
      />,
      { wrapper: WithModalProvider },
    );

    expect(screen.getByText("habitNotes.title")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "habitNotes.habitLabelMorning Walk",
    );
    expect(await screen.findByText("habitNotes.emptyState.title")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "createNoteModal.submitText" }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(new URL(requestedUrl).pathname).toBe(
      ENDPOINTS.HABITS.NOTES("habit-1"),
    );
  });

  it("keeps single-action note creation available", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            items: [],
            pagination: { page: 1, size: 50, total: 0, pages: 0 },
            meta: { habit_action_id: "action-1" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );
    const habitAction: NoteHabitActionSummary = {
      id: "action-1",
      habit_id: "habit-1",
      habit_title: "Morning Walk",
      action_date: "2026-07-06",
      status: "done",
    };

    renderWithProviders(
      <TaskNotesModal
        isOpen
        onClose={vi.fn()}
        entityType="habit_action"
        habitAction={habitAction}
      />,
      { wrapper: WithModalProvider },
    );

    expect(screen.getByText("habitActionNotes.title")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "createNoteModal.submitText" }),
    ).toBeEnabled();
  });

  it("loads subsequent habit note pages on demand", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const page = Number(new URL(String(input)).searchParams.get("page"));
        return Promise.resolve(
          new Response(
            JSON.stringify({
              items: [
                page === 1
                  ? makeNote("note-1", "First habit note")
                  : makeNote("note-2", "Second habit note"),
              ],
              pagination: { page, size: 50, total: 2, pages: 2 },
              meta: { habit_id: "habit-1" },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      });

    renderWithProviders(
      <TaskNotesModal
        isOpen
        onClose={vi.fn()}
        entityType="habit"
        habit={{ id: "habit-1" as UUID, title: "Morning Walk" }}
      />,
      { wrapper: WithModalProvider },
    );

    expect(await screen.findByText("First habit note")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "notes.loadMore" }),
    );
    expect(await screen.findByText("Second habit note")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("page=2"),
      expect.anything(),
    );
  });
});
