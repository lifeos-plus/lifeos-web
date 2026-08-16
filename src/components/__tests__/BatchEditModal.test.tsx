import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@test/utils";
import { ModalProvider } from "@/contexts/ModalProvider";
import BatchEditModal from "@/components/BatchEditModal";

const batchUpdateMock = vi.fn();

vi.mock("@/services/api/timelogs", () => ({
  timelogsApi: {
    batchUpdate: (...args: unknown[]) => batchUpdateMock(...args),
  },
}));

vi.mock("@/components/selects/PersonSelector", () => ({
  default: ({
    onSelectionChange,
  }: {
    onSelectionChange: (ids: string[]) => void;
  }) => (
    <button type="button" onClick={() => onSelectionChange(["p1"])}>
      select-person
    </button>
  ),
}));

vi.mock("@/components/selects/TaskSelector", () => ({
  default: () => <input data-testid="task-selector" />,
}));

vi.mock("@/components/selects/AreaSelect", () => ({
  default: () => <input data-testid="area-select" />,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ModalProvider>{children}</ModalProvider>
);

describe("BatchEditModal", () => {
  it("submits a person association update", async () => {
    batchUpdateMock.mockResolvedValue({
      updated_count: 1,
      failed_ids: [],
      errors: [],
    });

    renderWithProviders(
      <BatchEditModal
        isOpen
        selectedEntryIds={new Set(["tl1"])}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: "select-person" }));
    fireEvent.click(screen.getByRole("button", { name: "common.edit" }));

    await waitFor(() => expect(batchUpdateMock).toHaveBeenCalled());
    const payload = batchUpdateMock.mock.calls[0][0] as {
      timelog_ids: string[];
      update_type: string;
      person?: { mode: string; person_ids: string[] };
    };
    expect(payload.timelog_ids).toEqual(["tl1"]);
    expect(payload.update_type).toBe("person");
    expect(payload.person).toEqual({
      mode: "replace",
      person_ids: ["p1"],
    });
  });

  it("submits a clear-person update without selecting anyone", async () => {
    batchUpdateMock.mockResolvedValue({
      updated_count: 1,
      failed_ids: [],
      errors: [],
    });

    renderWithProviders(
      <BatchEditModal
        isOpen
        selectedEntryIds={new Set(["tl1"])}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole("button", { name: "common.clear" }));
    fireEvent.click(screen.getByRole("button", { name: "common.edit" }));

    await waitFor(() => expect(batchUpdateMock).toHaveBeenCalled());
    const payload = batchUpdateMock.mock.calls[0][0] as {
      person?: { mode: string; person_ids: string[] };
    };
    expect(payload.person).toEqual({ mode: "clear", person_ids: [] });
  });
});
