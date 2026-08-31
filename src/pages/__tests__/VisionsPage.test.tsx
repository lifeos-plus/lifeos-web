import React from "react";
import { act, render } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { type ReactNode } from "react";

import { renderWithProviders, setupTranslationMock } from "@test/utils";

const setHeaderMock = vi.fn();

interface VisionLike {
  id: string;
  status: string;
  area_id: string | null;
}

const {
  visionManagerPropsRef,
  enumSelectPropsRef,
  areaSelectPropsRef,
  allVisionsState,
} = vi.hoisted(() => ({
    visionManagerPropsRef: { current: undefined as unknown },
    enumSelectPropsRef: { current: undefined as unknown },
    areaSelectPropsRef: { current: undefined as unknown },
    allVisionsState: { value: [] as VisionLike[] },
  }));

vi.mock("@/contexts/PageHeaderContext", () => ({
  usePageHeader: () => ({
    setHeader: setHeaderMock,
  }),
}));

vi.mock("@/hooks/queries/useAllVisions", () => ({
  useAllVisions: () => ({
    visions: allVisionsState.value,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/components/VisionManager", () => ({
  __esModule: true,
  default: React.forwardRef((props: unknown, _ref) => {
    visionManagerPropsRef.current = props;
    return <div data-testid="vision-manager" />;
  }),
}));

vi.mock("@/components/selects/AreaSelect", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    areaSelectPropsRef.current = props;
    return <div data-testid="area-select" />;
  },
}));

vi.mock("@/components/selects/EnumSelect", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    enumSelectPropsRef.current = props;
    return <div data-testid="status-select" />;
  },
}));

vi.mock("@/components/ActionButton", () => ({
  CreateNewButton: ({ label }: { label: string }) => <button>{label}</button>,
}));

vi.mock("@/layouts/PageLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import VisionsPage from "@/pages/VisionsPage";

const renderPage = () => {
  renderWithProviders(<VisionsPage />);
  const actions = setHeaderMock.mock.calls.at(-1)?.[0].actions as ReactNode;
  render(<div>{actions}</div>);
  return actions;
};

const renderLatestHeaderActions = () => {
  const actions = setHeaderMock.mock.calls.at(-1)?.[0].actions as ReactNode;
  render(<div>{actions}</div>);
};

interface EnumSelectPropsLike {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

interface AreaSelectPropsLike {
  value?: string | null;
  optionCounts: Record<string, number>;
  sortByCount: boolean;
  onChange: (value?: string | null) => void;
}

describe("VisionsPage", () => {
  beforeEach(() => {
    setupTranslationMock();
    setHeaderMock.mockClear();
    allVisionsState.value = [];
  });

  it("builds status counts across all areas and area counts for the active status", () => {
    allVisionsState.value = [
      { id: "v1", status: "active", area_id: "area-1" },
      { id: "v2", status: "active", area_id: "area-1" },
      { id: "v3", status: "fruit", area_id: null },
    ];

    renderPage();

    const managerProps = visionManagerPropsRef.current as {
      statusFilter?: string;
    };
    expect(managerProps.statusFilter).toBe("active");

    const enumProps = enumSelectPropsRef.current as EnumSelectPropsLike;
    expect(enumProps.value).toBe("active");
    expect(enumProps.options.map((o) => o.value)).toEqual([
      "__all__",
      "active",
      "fruit",
      "archived",
    ]);
    const labels = enumProps.options.map((o) => o.label);
    expect(labels[0]).toBe("common.all (3)");
    expect(labels.slice(1)).toEqual([
      expect.stringMatching(/^.+ \(2\)$/),
      expect.stringMatching(/^.+ \(1\)$/),
      expect.stringMatching(/^.+ \(0\)$/),
    ]);

    const areaProps = areaSelectPropsRef.current as AreaSelectPropsLike;
    expect(areaProps.sortByCount).toBe(true);
    expect(areaProps.optionCounts).toEqual({
      __all__: 2,
      __none__: 0,
      "area-1": 2,
    });
  });

  it("updates status counts when the area filter changes", () => {
    allVisionsState.value = [
      { id: "v1", status: "active", area_id: "area-1" },
      { id: "v2", status: "active", area_id: "area-1" },
      { id: "v3", status: "fruit", area_id: null },
      { id: "v4", status: "archived", area_id: "area-2" },
    ];

    renderPage();

    const areaProps = areaSelectPropsRef.current as AreaSelectPropsLike;
    act(() => {
      areaProps.onChange("area-2");
    });
    renderLatestHeaderActions();

    const managerProps = visionManagerPropsRef.current as {
      areaFilter?: string | null;
    };
    expect(managerProps.areaFilter).toBe("area-2");

    const enumProps = enumSelectPropsRef.current as EnumSelectPropsLike;
    expect(enumProps.options.map((option) => option.value)).toEqual([
      "__all__",
      "archived",
      "active",
      "fruit",
    ]);
    expect(enumProps.options.map((option) => option.label)).toEqual([
      "common.all (1)",
      expect.stringMatching(/^.+ \(1\)$/),
      expect.stringMatching(/^.+ \(0\)$/),
      expect.stringMatching(/^.+ \(0\)$/),
    ]);
  });

  it("updates area counts when the status filter changes", () => {
    allVisionsState.value = [
      { id: "v1", status: "active", area_id: "area-1" },
      { id: "v2", status: "active", area_id: "area-1" },
      { id: "v3", status: "fruit", area_id: null },
    ];

    renderPage();

    const enumProps = enumSelectPropsRef.current as EnumSelectPropsLike;
    act(() => {
      enumProps.onChange("fruit");
    });
    renderLatestHeaderActions();

    const managerProps = visionManagerPropsRef.current as {
      statusFilter?: string;
    };
    expect(managerProps.statusFilter).toBe("fruit");

    const areaProps = areaSelectPropsRef.current as AreaSelectPropsLike;
    expect(areaProps.optionCounts).toEqual({
      __all__: 1,
      __none__: 1,
    });
  });

  it("selecting the all status option clears the status filter", () => {
    allVisionsState.value = [
      { id: "v1", status: "active", area_id: "area-1" },
      { id: "v2", status: "archived", area_id: null },
    ];

    renderPage();

    const enumProps = enumSelectPropsRef.current as EnumSelectPropsLike;
    act(() => {
      enumProps.onChange("__all__");
    });

    const managerProps = visionManagerPropsRef.current as {
      statusFilter?: string;
    };
    expect(managerProps.statusFilter).toBeUndefined();
  });
});
