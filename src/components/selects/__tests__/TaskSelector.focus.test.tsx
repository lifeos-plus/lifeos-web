import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

import { renderWithProviders, setupTranslationMock } from "@test/utils";
import { tasksApi } from "@/services/api/tasks";

setupTranslationMock();

type MockDropdownOptions = {
  isOpen: boolean;
  usePortal?: boolean;
  [key: string]: unknown;
};

vi.mock("@/components/selects/useDropdownSurface", () => ({
  useDropdownSurface: (options: MockDropdownOptions) => ({
    isOpen: options.isOpen,
    menuRef: { current: null },
    menuPos: { top: 0, left: 0, width: 240, maxHeight: 320 },
    dataTheme: undefined,
    usePortal: options.usePortal ?? true,
    portalTarget: null,
    getSurfaceStyle: (style: Record<string, unknown> = {}) => ({
      position: options.usePortal ? "fixed" : "absolute",
      ...style,
    }),
    renderSurface: (element: React.ReactElement) =>
      options.isOpen ? element : null,
    recomputePosition: vi.fn(),
  }),
}));

vi.mock("@/hooks/queries/useVisions", () => ({
  useVisions: () => ({ visions: [] }),
}));

vi.mock("@/services/api/tasks", () => ({
  tasksApi: {
    getById: vi.fn(),
    searchSelectorPage: vi.fn(),
  },
}));

import TaskSelector from "@/components/selects/TaskSelector";

const emptyPage = {
  items: [],
  pagination: { page: 1, size: 50, total: 0, pages: 0 },
  meta: {},
};

describe("TaskSelector filter input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tasksApi.searchSelectorPage).mockResolvedValue(emptyPage as never);
  });

  it("keeps the input active while the first remote search is loading", async () => {
    let resolveFirstSearch: (value: unknown) => void = () => {};
    const firstSearch = new Promise((resolve) => {
      resolveFirstSearch = resolve;
    });
    vi.mocked(tasksApi.searchSelectorPage)
      .mockImplementationOnce(() => firstSearch as never)
      .mockResolvedValue(emptyPage as never);

    const user = userEvent.setup();

    renderWithProviders(
      <TaskSelector value={null} onChange={vi.fn()} usePortal={false} />,
    );

    const input = screen.getByRole("combobox") as HTMLInputElement;

    await user.click(input);

    await waitFor(() =>
      expect(tasksApi.searchSelectorPage).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "true"));

    // The click that opens the dropdown also starts the remote search. The
    // loading state must not disable the input, otherwise the browser moves
    // focus away and the user has to click a second time before typing.
    expect(input).not.toBeDisabled();
    expect(document.activeElement).toBe(input);

    await user.type(input, "alp");

    expect(input).toHaveValue("alp");
    await waitFor(() =>
      expect(tasksApi.searchSelectorPage).toHaveBeenCalledWith(
        expect.objectContaining({ query: "alp" }),
      ),
    );
    expect(input).not.toBeDisabled();
    expect(document.activeElement).toBe(input);

    await act(async () => {
      resolveFirstSearch(emptyPage);
      await firstSearch;
    });
  });
});
