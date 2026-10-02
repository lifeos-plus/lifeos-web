import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SnapshotDetail, SnapshotFormPanel } from "@/features/finance/SnapshotPanels";
import type {
  FinanceAsset,
  FinanceSnapshot,
  FinanceTree,
  FinanceTreeNode,
} from "@/services/api/finance";
import { renderWithProviders, setupTranslationMock } from "@test/utils";

const assets: FinanceAsset[] = [
  {
    id: "asset-usd",
    code: "USD",
    name: "US Dollar",
    decimal_places: 2,
    is_default: true,
  },
  {
    id: "asset-eth",
    code: "ETH",
    name: "Ethereum",
    decimal_places: 8,
    is_default: true,
  },
];

const node: FinanceTreeNode = {
  id: "node-wallet",
  parent_id: null,
  name: "Wallet",
  currency_code: "ETH",
  path: "Wallet",
  depth: 0,
  display_order: 1,
};

const tree: FinanceTree = {
  id: "tree-balance",
  name: "Balance",
  primary_currency: "USD",
  display_order: 1,
  is_default: true,
  nodes: [node],
};

const sourceSnapshot: FinanceSnapshot = {
  id: "snapshot-source",
  tree_id: tree.id,
  tree_name: tree.name,
  title: "June balance",
  snapshot_ts: "2026-06-30T20:00:00.000Z",
  period_start: null,
  period_end: null,
  primary_currency: "USD",
  rate_snapshot_id: "rate-june",
  note: "Source note",
  entries: [
    {
      id: "entry-wallet",
      node_id: node.id,
      node_name: node.name,
      amount: "1.00000000",
      currency_code: "ETH",
      amount_converted: "1573.8800",
      note: "Main wallet",
      is_auto_generated: false,
    },
  ],
  created_at: "2026-06-30T20:01:00.000Z",
};

describe("SnapshotFormPanel", () => {
  it("renders snapshot entry rows with hover state", () => {
    setupTranslationMock();

    renderWithProviders(
      <SnapshotFormPanel
        tree={tree}
        preset={{
          report: "balance",
          titleKey: "finance.balance.title",
          descriptionKey: "finance.balance.description",
          timeMode: "instant",
        }}
        assets={assets}
        onCreateAsset={vi.fn()}
        treeOptions={[tree]}
        selectedTreeId={tree.id}
        onSelectTree={vi.fn()}
        treeNodes={[{ ...node, children: [] }]}
        rateSnapshots={[]}
        submitting={false}
        mode="create"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const row = screen.getByText("Wallet").closest("tr");

    expect(row).toHaveClass("hover:bg-primary/10");
    expect(row).toHaveClass("focus-within:bg-primary/10");
  });

  it("prefills copied snapshots and submits create-ready entries", async () => {
    setupTranslationMock();
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(
      <SnapshotFormPanel
        tree={tree}
        preset={{
          report: "balance",
          titleKey: "finance.balance.title",
          descriptionKey: "finance.balance.description",
          timeMode: "instant",
        }}
        assets={assets}
        onCreateAsset={vi.fn()}
        treeOptions={[tree]}
        selectedTreeId={tree.id}
        onSelectTree={vi.fn()}
        treeNodes={[{ ...node, children: [] }]}
        rateSnapshots={[]}
        submitting={false}
        mode="copy"
        initialSnapshot={sourceSnapshot}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("June balance")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("1.00000000")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "common.save" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "June balance",
        primary_currency: "USD",
        rate_snapshot_id: "rate-june",
        note: "Source note",
        entries: [
          {
            node_id: node.id,
            amount: "1",
            currency_code: "ETH",
            note: "Main wallet",
          },
        ],
      }),
    );
    expect(onSubmit.mock.calls[0]?.[0].snapshot_ts).toEqual(expect.any(String));
    expect(onSubmit.mock.calls[0]?.[0].snapshot_ts).not.toBe(sourceSnapshot.snapshot_ts);
  });
});

describe("SnapshotDetail", () => {
  it("renders detail tree rows with hover state", () => {
    setupTranslationMock();

    renderWithProviders(
      <SnapshotDetail
        snapshot={sourceSnapshot}
        assets={assets}
        treeNodes={[{ ...node, children: [] }]}
        rateSnapshots={[]}
      />,
    );

    const row = screen.getByText("Wallet").closest("tr");
    const assetSummaryPanel = screen
      .getByText("finance.metrics.assetSummary")
      .closest(".rounded-lg");
    const assetSummaryRow = assetSummaryPanel?.querySelector("tbody tr");

    expect(row).toHaveClass("hover:bg-primary/10");
    expect(row).toHaveClass("focus-within:bg-primary/10");
    expect(assetSummaryRow).toHaveClass("hover:bg-primary/10");
    expect(assetSummaryRow).toHaveClass("focus-within:bg-primary/10");
  });

  it("keeps group rows free of descendant currencies and shows leaf native amounts", () => {
    setupTranslationMock();

    const assetsNode: FinanceTreeNode = {
      id: "node-assets",
      parent_id: null,
      name: "Assets",
      currency_code: null,
      path: "Assets",
      depth: 0,
      display_order: 1,
    };
    const ethNode: FinanceTreeNode = {
      id: "node-eth",
      parent_id: assetsNode.id,
      name: "ETH wallet",
      currency_code: "ETH",
      path: "Assets/ETH wallet",
      depth: 1,
      display_order: 1,
    };
    const cnyNode: FinanceTreeNode = {
      id: "node-cny",
      parent_id: assetsNode.id,
      name: "CNY wallet",
      currency_code: "CNY",
      path: "Assets/CNY wallet",
      depth: 1,
      display_order: 2,
    };

    const convertedSnapshot: FinanceSnapshot = {
      ...sourceSnapshot,
      id: "snapshot-converted",
      entries: [
        {
          id: "entry-eth",
          node_id: ethNode.id,
          node_name: ethNode.name,
          amount: "1.00000000",
          currency_code: "ETH",
          amount_converted: "1573.8800",
          note: null,
          is_auto_generated: false,
        },
        {
          id: "entry-cny",
          node_id: cnyNode.id,
          node_name: cnyNode.name,
          amount: "100.00000000",
          currency_code: "CNY",
          amount_converted: "150.0000",
          note: null,
          is_auto_generated: false,
        },
        {
          id: "rollup-eth",
          node_id: assetsNode.id,
          node_name: assetsNode.name,
          amount: "1.00000000",
          currency_code: "ETH",
          amount_converted: "1573.8800",
          note: null,
          is_auto_generated: true,
        },
        {
          id: "rollup-cny",
          node_id: assetsNode.id,
          node_name: assetsNode.name,
          amount: "100.00000000",
          currency_code: "CNY",
          amount_converted: "150.0000",
          note: null,
          is_auto_generated: true,
        },
      ],
      summary: { aggregation_mode: "converted" },
    };

    renderWithProviders(
      <SnapshotDetail
        snapshot={convertedSnapshot}
        assets={assets}
        treeNodes={[
          {
            ...assetsNode,
            children: [
              { ...ethNode, children: [] },
              { ...cnyNode, children: [] },
            ],
          },
        ]}
        rateSnapshots={[]}
      />,
    );

    const assetsRow = screen.getByText("Assets").closest("tr");
    expect(assetsRow).not.toBeNull();
    expect(within(assetsRow as HTMLElement).queryByText("ETH")).not.toBeInTheDocument();
    expect(within(assetsRow as HTMLElement).queryByText("CNY")).not.toBeInTheDocument();
    expect(assetsRow).toHaveTextContent("1723.88");

    const ethCells = within(screen.getByText("ETH wallet").closest("tr") as HTMLElement).getAllByRole(
      "cell",
    );
    const cnyCells = within(screen.getByText("CNY wallet").closest("tr") as HTMLElement).getAllByRole(
      "cell",
    );
    expect(ethCells[1]).toHaveTextContent("ETH");
    expect(ethCells[2]).toHaveTextContent(/^1$/);
    expect(cnyCells[1]).toHaveTextContent("CNY");
    expect(cnyCells[2]).toHaveTextContent(/^100$/);
  });

  it("hides zero-amount nodes and assets from the detail tree", () => {
    setupTranslationMock();

    const assetsNode: FinanceTreeNode = {
      id: "node-assets",
      parent_id: null,
      name: "Assets",
      currency_code: null,
      path: "Assets",
      depth: 0,
      display_order: 1,
    };
    const ethNode: FinanceTreeNode = {
      id: "node-eth",
      parent_id: assetsNode.id,
      name: "ETH wallet",
      currency_code: "ETH",
      path: "Assets/ETH wallet",
      depth: 1,
      display_order: 1,
    };
    const emptyNode: FinanceTreeNode = {
      id: "node-empty",
      parent_id: assetsNode.id,
      name: "Empty wallet",
      currency_code: "CNY",
      path: "Assets/Empty wallet",
      depth: 1,
      display_order: 2,
    };

    const zeroSnapshot: FinanceSnapshot = {
      ...sourceSnapshot,
      id: "snapshot-zero-rows",
      entries: [
        {
          id: "entry-eth",
          node_id: ethNode.id,
          node_name: ethNode.name,
          amount: "1.00000000",
          currency_code: "ETH",
          amount_converted: "1573.8800",
          note: null,
          is_auto_generated: false,
        },
        {
          id: "entry-empty",
          node_id: emptyNode.id,
          node_name: emptyNode.name,
          amount: "0.00000000",
          currency_code: "CNY",
          amount_converted: "0.00000000",
          note: null,
          is_auto_generated: false,
        },
        {
          id: "rollup-eth",
          node_id: assetsNode.id,
          node_name: assetsNode.name,
          amount: "1.00000000",
          currency_code: "ETH",
          amount_converted: "1573.8800",
          note: null,
          is_auto_generated: true,
        },
        {
          id: "rollup-cny",
          node_id: assetsNode.id,
          node_name: assetsNode.name,
          amount: "0.00000000",
          currency_code: "CNY",
          amount_converted: "0.00000000",
          note: null,
          is_auto_generated: true,
        },
      ],
      summary: {
        aggregation_mode: "converted",
        amounts_by_currency: {
          USD: { total_positive: "1573.88", total_negative: "0", net_amount: "1573.88" },
        },
      },
    };

    renderWithProviders(
      <SnapshotDetail
        snapshot={zeroSnapshot}
        assets={assets}
        treeNodes={[
          {
            ...assetsNode,
            children: [
              { ...ethNode, children: [] },
              { ...emptyNode, children: [] },
            ],
          },
        ]}
        rateSnapshots={[]}
      />,
    );

    expect(screen.getByText("ETH wallet")).toBeInTheDocument();
    expect(screen.queryByText("Empty wallet")).not.toBeInTheDocument();
    expect(screen.queryByText("CNY")).not.toBeInTheDocument();
  });

  it("shows the empty-state hint when every detail row is zero", () => {
    setupTranslationMock();

    const zeroOnlySnapshot: FinanceSnapshot = {
      ...sourceSnapshot,
      id: "snapshot-zero-only",
      entries: [
        {
          id: "entry-wallet",
          node_id: node.id,
          node_name: node.name,
          amount: "0.00000000",
          currency_code: "ETH",
          amount_converted: "0.00000000",
          note: null,
          is_auto_generated: false,
        },
      ],
      summary: { aggregation_mode: "converted" },
    };

    renderWithProviders(
      <SnapshotDetail
        snapshot={zeroOnlySnapshot}
        assets={assets}
        treeNodes={[{ ...node, children: [] }]}
        rateSnapshots={[]}
      />,
    );

    expect(screen.getByText("finance.snapshot.noVisibleAmounts")).toBeInTheDocument();
    expect(screen.queryByText("Wallet")).not.toBeInTheDocument();
  });

  it("keeps the converted total when a zero-amount currency has no rate", () => {
    setupTranslationMock();

    const zeroRateSnapshot: FinanceSnapshot = {
      ...sourceSnapshot,
      id: "snapshot-zero-rate",
      entries: [],
      summary: {
        aggregation_mode: "converted",
        amounts_by_currency: {
          USD: { total_positive: "500", total_negative: "0", net_amount: "500" },
          EUR: { total_positive: "0", total_negative: "0", net_amount: "0" },
        },
      },
      exchange_rates: {
        primary_currency: "USD",
        rate_snapshot_id: sourceSnapshot.rate_snapshot_id,
        captured_at: "2026-06-30T20:00:00.000Z",
        rates: {},
      },
    };

    renderWithProviders(
      <SnapshotDetail
        snapshot={zeroRateSnapshot}
        assets={assets}
        treeNodes={[]}
        rateSnapshots={[]}
      />,
    );

    const totalLabel = screen.getByText("finance.metrics.totalValue");
    expect(totalLabel.parentElement).toHaveTextContent("500");
  });
});
