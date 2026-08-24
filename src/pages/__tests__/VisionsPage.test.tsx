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

const { visionManagerPropsRef, enumSelectPropsRef, areaSelectPropsRef, allVisionsState } =
  vi.hoisted(() => ({
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
  const actions = setHeaderMock.mock.calls[0][0].actions as ReactNode;
  // 渲染 header actions，触发 EnumSelect / AreaSelect mock 记录 props
  render(<div>{actions}</div>);
  return actions;
};

interface EnumSelectPropsLike {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

describe("VisionsPage", () => {
  beforeEach(() => {
    setupTranslationMock();
    setHeaderMock.mockClear();
    allVisionsState.value = [];
  });

  it("builds counted status and area filter options from all visions", () => {
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

    // 状态选项：全部最前，其余按计数降序（不依赖具体翻译文本）
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

    // 区域选项计数（含全部/无 特殊选项）
    const areaProps = areaSelectPropsRef.current as {
      optionCounts: Record<string, number>;
      sortByCount: boolean;
    };
    expect(areaProps.sortByCount).toBe(true);
    expect(areaProps.optionCounts).toEqual({
      __all__: 3,
      __none__: 1,
      "area-1": 2,
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
