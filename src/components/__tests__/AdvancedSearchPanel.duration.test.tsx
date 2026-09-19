import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { setupTranslationMock } from "@test/utils";
import type { UUID } from "@/types/primitive";

setupTranslationMock();

vi.mock("@/layouts/Card", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/hooks/queries/useDefaultInboxVision", () => ({
  useDefaultInboxVision: () => ({ defaultInboxVision: null }),
}));

vi.mock("@/components/selects/AreaSelect", () => ({
  __esModule: true,
  default: () => <div data-testid="area-select" />,
}));

vi.mock("@/components/selects/TaskSelector", () => ({
  __esModule: true,
  default: () => <div data-testid="task-selector" />,
}));

vi.mock("@/components/BatchEditModal", () => ({
  __esModule: true,
  default: () => <div data-testid="batch-edit-modal" />,
}));

import AdvancedSearchPanel from "@/components/AdvancedSearchPanel";

type PanelParams = {
  start_date: Date;
  end_date: Date;
  area_id: UUID | null | undefined;
  description_keyword: string | null;
  task_id: UUID | null | undefined;
  with_task: boolean;
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
};

const BASE_PARAMS: PanelParams = {
  start_date: new Date("2026-09-01T00:00:00.000Z"),
  end_date: new Date("2026-09-02T00:00:00.000Z"),
  area_id: undefined,
  description_keyword: null,
  task_id: undefined,
  with_task: false,
  min_duration_minutes: null,
  max_duration_minutes: null,
};

const renderPanel = (params: PanelParams = BASE_PARAMS) => {
  const onParamsChange = vi.fn();
  render(
    <AdvancedSearchPanel
      params={params}
      onParamsChange={onParamsChange}
      onSearch={vi.fn()}
      onReset={vi.fn()}
      tasks={[]}
      isSelectMode={false}
      onSelectModeToggle={vi.fn()}
      selectedEntryIds={new Set()}
      onSelectAll={vi.fn()}
      onSelectInverse={vi.fn()}
      onClearSelection={vi.fn()}
      onBatchDelete={vi.fn()}
      filteredEntriesCount={0}
      onBatchEditSuccess={vi.fn()}
      timezone="UTC"
    />,
  );
  return { onParamsChange };
};

describe("AdvancedSearchPanel duration filters", () => {
  it("renders the duration bounds carried by params", () => {
    renderPanel({
      ...BASE_PARAMS,
      min_duration_minutes: -1,
      max_duration_minutes: 45,
    });

    const minInput = screen.getByLabelText(
      "timeLog.advancedSearch.durationMinLabel",
    );
    const maxInput = screen.getByLabelText(
      "timeLog.advancedSearch.durationMaxLabel",
    );
    expect(minInput).toHaveValue("-1");
    expect(maxInput).toHaveValue("45");
  });

  it("reports typed duration bounds including negative minimums", async () => {
    const user = userEvent.setup();
    const { onParamsChange } = renderPanel();

    const minInput = screen.getByLabelText(
      "timeLog.advancedSearch.durationMinLabel",
    );
    const maxInput = screen.getByLabelText(
      "timeLog.advancedSearch.durationMaxLabel",
    );

    await user.type(minInput, "-1");
    await user.type(maxInput, "45");

    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({ min_duration_minutes: -1 }),
    );
    expect(onParamsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ max_duration_minutes: 45 }),
    );
  });

  it("clears a duration bound when the input is emptied", async () => {
    const user = userEvent.setup();
    const { onParamsChange } = renderPanel({
      ...BASE_PARAMS,
      min_duration_minutes: -1,
      max_duration_minutes: 45,
    });

    const minInput = screen.getByLabelText(
      "timeLog.advancedSearch.durationMinLabel",
    );
    await user.clear(minInput);

    expect(onParamsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ min_duration_minutes: null }),
    );
  });

  it("ignores non-numeric keystrokes instead of silently dropping the filter", async () => {
    const user = userEvent.setup();
    const { onParamsChange } = renderPanel();

    const maxInput = screen.getByLabelText(
      "timeLog.advancedSearch.durationMaxLabel",
    );
    await user.type(maxInput, "4a5");

    expect(maxInput).toHaveValue("45");
    expect(onParamsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ max_duration_minutes: 45 }),
    );
  });

  it("stops at six digits so the request stays a plain integer", async () => {
    const user = userEvent.setup();
    const { onParamsChange } = renderPanel();

    const maxInput = screen.getByLabelText(
      "timeLog.advancedSearch.durationMaxLabel",
    );
    await user.type(maxInput, "1234567890");

    expect(maxInput).toHaveValue("123456");
    expect(onParamsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ max_duration_minutes: 123456 }),
    );
  });

  it("keeps the duration range next to the date filters", () => {
    renderPanel();

    const endDate = screen.getByLabelText("timeLog.advancedSearch.endDate");
    const minInput = screen.getByLabelText(
      "timeLog.advancedSearch.durationMinLabel",
    );
    const areaSelect = screen.getByTestId("area-select");
    const keyword = screen.getByLabelText("timeLog.advancedSearch.keyword");

    expect(
      endDate.compareDocumentPosition(minInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      minInput.compareDocumentPosition(areaSelect) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      areaSelect.compareDocumentPosition(keyword) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
