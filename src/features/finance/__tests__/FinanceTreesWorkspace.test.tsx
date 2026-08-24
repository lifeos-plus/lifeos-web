import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ModalProvider } from "@/contexts/ModalProvider";
import { FinanceTreesWorkspace } from "@/pages/FinancePage";
import type {
  FinanceAsset,
  FinanceAssetListResponse,
  FinanceTree,
  FinanceTreeListResponse,
} from "@/services/api/finance";
import { renderWithProviders } from "@test/utils";

const financeApiMocks = vi.hoisted(() => ({
  listAssets: vi.fn(),
  listTrees: vi.fn(),
  getTree: vi.fn(),
  copyTree: vi.fn(),
}));

vi.mock("@/services/api/finance", () => ({
  financeApi: financeApiMocks,
}));

const assetListResponse = (items: FinanceAsset[]): FinanceAssetListResponse => ({
  items,
  pagination: { page: 1, size: 200, total: items.length, pages: 1 },
  meta: {},
});

const treeListResponse = (items: FinanceTree[]): FinanceTreeListResponse => ({
  items,
  pagination: { page: 1, size: 100, total: items.length, pages: 1 },
  meta: {},
});

const sourceTree: FinanceTree = {
  id: "tree-source",
  name: "Personal",
  primary_currency: "USD",
  display_order: 10,
  is_default: true,
  nodes: [],
};

const copiedTree: FinanceTree = {
  id: "tree-copy",
  name: "Personal Copy",
  primary_currency: "USD",
  display_order: 10,
  is_default: false,
  nodes: [],
};

describe("FinanceTreesWorkspace", () => {
  beforeEach(() => {
    financeApiMocks.listAssets.mockResolvedValue(
      assetListResponse([
        {
          id: "asset-usd",
          code: "USD",
          name: "US Dollar",
          decimal_places: 2,
          is_default: true,
        },
      ]),
    );
    financeApiMocks.listTrees
      .mockResolvedValueOnce(treeListResponse([sourceTree]))
      .mockResolvedValue(treeListResponse([sourceTree, copiedTree]));
    financeApiMocks.getTree.mockImplementation(async (treeId: string) =>
      treeId === "tree-source" ? sourceTree : copiedTree,
    );
    financeApiMocks.copyTree.mockResolvedValue(copiedTree);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("copies the current tree through the atomic endpoint and selects the copy", async () => {
    const user = userEvent.setup();

    renderWithProviders(<FinanceTreesWorkspace />, {
      wrapper: ({ children }: PropsWithChildren) => (
        <ModalProvider>{children}</ModalProvider>
      ),
    });

    expect(await screen.findByText("Personal")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "common.copy" }));

    await waitFor(() => {
      expect(financeApiMocks.copyTree).toHaveBeenCalledTimes(1);
    });
    expect(financeApiMocks.copyTree).toHaveBeenCalledWith("tree-source");
    expect(await screen.findByText("Personal Copy")).toBeInTheDocument();
  });
});
