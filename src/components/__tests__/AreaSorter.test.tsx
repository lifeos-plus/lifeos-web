import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AreaSorter from "@/components/AreaSorter";
import { areasApi } from "@/services/api/areas";

vi.mock("@/services/api/areas", () => ({
  areasApi: {
    getAreas: vi.fn(),
  },
}));

const AREAS = [
  { id: "area-a", name: "Area A", color: "#111111", is_active: true },
  { id: "area-b", name: "Area B", color: "#222222", is_active: true },
  { id: "area-c", name: "Area C", color: "#333333", is_active: true },
];

async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

function findItem(name: string): HTMLElement {
  const item = screen
    .getAllByRole("listitem")
    .find((element) => element.textContent?.includes(name));
  if (!item) {
    throw new Error(`Area item "${name}" was not found`);
  }
  return item;
}

function moveUp(name: string): void {
  fireEvent.click(
    within(findItem(name)).getByRole("button", {
      name: "settings.areaSorter.moveUp",
    }),
  );
}

describe("AreaSorter", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(areasApi.getAreas).mockReset();
    vi.mocked(areasApi.getAreas).mockResolvedValue({ items: AREAS } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders areas in the given order", async () => {
    render(
      <AreaSorter
        areaOrder={["area-a", "area-b", "area-c"]}
        onOrderChange={vi.fn()}
      />,
    );
    await flushMicrotasks();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Area A");
    expect(items[1]).toHaveTextContent("Area B");
    expect(items[2]).toHaveTextContent("Area C");
  });

  it("debounces rapid moves into a single save with the final order", async () => {
    vi.useFakeTimers();
    const onOrderChange = vi.fn();
    render(
      <AreaSorter
        areaOrder={["area-a", "area-b", "area-c"]}
        onOrderChange={onOrderChange}
      />,
    );
    await flushMicrotasks();

    moveUp("Area B");
    moveUp("Area C");

    expect(onOrderChange).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(onOrderChange).toHaveBeenCalledTimes(1);
    expect(onOrderChange).toHaveBeenCalledWith([
      "area-b",
      "area-c",
      "area-a",
    ]);
  });

  it("commits the order after the debounce window and supports further moves", async () => {
    vi.useFakeTimers();
    const onOrderChange = vi.fn();
    function ControlledAreaSorter() {
      const [order, setOrder] = useState<string[]>([
        "area-a",
        "area-b",
        "area-c",
      ]);
      return (
        <AreaSorter
          areaOrder={order}
          onOrderChange={(nextOrder) => {
            onOrderChange(nextOrder);
            setOrder(nextOrder);
          }}
        />
      );
    }

    render(<ControlledAreaSorter />);
    await flushMicrotasks();

    moveUp("Area B");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onOrderChange).toHaveBeenCalledTimes(1);
    expect(onOrderChange).toHaveBeenLastCalledWith([
      "area-b",
      "area-a",
      "area-c",
    ]);

    moveUp("Area C");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onOrderChange).toHaveBeenCalledTimes(2);
    expect(onOrderChange).toHaveBeenLastCalledWith([
      "area-b",
      "area-c",
      "area-a",
    ]);
  });
});
