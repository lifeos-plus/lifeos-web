import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setupTranslationMock } from "@test/utils";
import NotesAdvancedSearchPanel, {
  type NotesAdvancedSearchFormState,
} from "@/components/notes/NotesAdvancedSearchPanel";

vi.mock("@/components/selects/TagSelector", () => ({
  default: ({ onTagsChange }: { onTagsChange: (ids: string[]) => void }) => (
    <button type="button" onClick={() => onTagsChange(["tag-2"])}>
      select tag
    </button>
  ),
}));

vi.mock("@/components/selects/PersonSelector", () => ({
  default: ({
    onSelectionChange,
  }: {
    onSelectionChange: (ids: string[]) => void;
  }) => (
    <button type="button" onClick={() => onSelectionChange(["person-2"])}>
      select person
    </button>
  ),
}));

vi.mock("@/components/selects/TaskSelector", () => ({
  default: ({ onChange }: { onChange: (id: string | null) => void }) => (
    <button type="button" onClick={() => onChange("task-2")}>
      select task
    </button>
  ),
}));

describe("NotesAdvancedSearchPanel", () => {
  const onParamsChange = vi.fn();
  const onSearch = vi.fn();

  const params: NotesAdvancedSearchFormState = {
    tag_id: null,
    person_id: null,
    task_id: null,
    keyword: "",
  };

  beforeEach(() => {
    setupTranslationMock();
    onParamsChange.mockReset();
    onSearch.mockReset();
  });

  it("updates each CLI-supported filter and submits keyword search", () => {
    render(
      <NotesAdvancedSearchPanel
        params={params}
        onParamsChange={onParamsChange}
        onSearch={onSearch}
        onReset={vi.fn()}
        availableTags={[]}
        onCreateTag={vi.fn()}
        availableTasks={[{ id: "task-2", name: "Task two" }]}
        isSelectMode={false}
        onSelectModeToggle={vi.fn()}
        selectedNoteIds={new Set()}
        onSelectAll={vi.fn()}
        onSelectInverse={vi.fn()}
        onClearSelection={vi.fn()}
        onOpenBatchEdit={vi.fn()}
        onBatchDelete={vi.fn()}
        totalResults={3}
        canCopyResults={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "select tag" }));
    fireEvent.click(screen.getByRole("button", { name: "select person" }));
    fireEvent.click(screen.getByRole("button", { name: "select task" }));

    expect(onParamsChange).toHaveBeenNthCalledWith(1, {
      ...params,
      tag_id: "tag-2",
    });
    expect(onParamsChange).toHaveBeenNthCalledWith(2, {
      ...params,
      person_id: "person-2",
    });
    expect(onParamsChange).toHaveBeenNthCalledWith(3, {
      ...params,
      task_id: "task-2",
    });

    const keyword = screen.getByLabelText("notes.advancedSearch.keyword");
    fireEvent.change(keyword, { target: { value: "review" } });
    fireEvent.keyDown(keyword, { key: "Enter" });

    expect(onParamsChange).toHaveBeenLastCalledWith({
      ...params,
      keyword: "review",
    });
  });
});
