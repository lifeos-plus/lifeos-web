import React, { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import VisionManager, {
  type VisionManagerHandle,
} from "@/components/VisionManager";

import { usePageHeader } from "@/contexts/PageHeaderContext";
import PageLayout from "@/layouts/PageLayout";
import { CreateNewButton } from "@/components/ActionButton";
import EnumSelect from "@/components/selects/EnumSelect";
import AreaSelect from "@/components/selects/AreaSelect";
import { VISION_STATUS_FILTER_OPTIONS } from "@/utils/constants";
import {
  ALL_FILTER_VALUE,
  buildCountedFilterOptions,
} from "@/utils/filterOptionCounts";
import { SelectorSpecialValue } from "@/components/selects/selectorTypes";
import { useAllVisions } from "@/hooks/queries/useAllVisions";
import type { UUID } from "@/types/primitive";

/**
 * VisionPage - Independent page for vision management
 *
 * This page provides a dedicated interface for managing user visions,
 * including creating, editing, and tracking vision progress.
 * Similar to NotesPage and TimeLogPage, this is a standalone feature page.
 */
const VisionPage: React.FC = () => {
  const { t } = useTranslation();
  const vmRef = useRef<VisionManagerHandle>(null);
  const { setHeader } = usePageHeader();

  // 全部愿景（无状态筛选），用于筛选选项的计数展示
  const { visions: allVisions } = useAllVisions();

  // Status filter state; undefined 表示"全部"
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    "active",
  );
  const [areaFilter, setAreaFilter] = useState<
    UUID | null | undefined
  >(undefined);

  // 状态筛选选项：附加 "(n)" 计数并按计数降序，最前为"全部"
  const statusOptions = useMemo(() => {
    const countsByStatus = new Map<string, number>();
    for (const vision of allVisions) {
      countsByStatus.set(
        vision.status,
        (countsByStatus.get(vision.status) ?? 0) + 1,
      );
    }
    return buildCountedFilterOptions(
      VISION_STATUS_FILTER_OPTIONS,
      countsByStatus,
      { allLabel: t("common.all"), totalCount: allVisions.length },
    );
  }, [allVisions, t]);

  // 区域筛选选项计数：key 为选项 id（含 __all__ / __none__ 特殊值）
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [SelectorSpecialValue.All]: allVisions.length,
    };
    let noneCount = 0;
    for (const vision of allVisions) {
      if (vision.area_id) {
        counts[vision.area_id] = (counts[vision.area_id] ?? 0) + 1;
      } else {
        noneCount += 1;
      }
    }
    counts[SelectorSpecialValue.None] = noneCount;
    return counts;
  }, [allVisions]);

  useEffect(() => {
    setHeader({
      actions: (
        <div className="flex items-center gap-2 flex-nowrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <AreaSelect
              value={areaFilter}
              onChange={(value) => setAreaFilter(value)}
              placeholder={t("common.all")}
              showAllOption
              showNoneOption
              noneLabel={t("visions.filters.areaNone")}
              showLabel={false}
              fullWidth={false}
              className="min-w-[180px]"
              id="vision-area-filter"
              optionCounts={areaCounts}
              sortByCount
            />
            <EnumSelect
              value={statusFilter ?? ALL_FILTER_VALUE}
              onChange={(value) =>
                setStatusFilter(
                  value === ALL_FILTER_VALUE ? undefined : (value as string),
                )
              }
              options={statusOptions}
              autoWidth
              className="text-sm min-w-[140px]"
              id="vision-status-filter"
            />
          </div>

          <CreateNewButton
            label={t("common.create_new")}
            onClick={() => vmRef.current?.openCreateVision()}
          />
        </div>
      ),
    });
    return () => setHeader({ actions: undefined });
  }, [setHeader, t, statusFilter, areaFilter, statusOptions, areaCounts]);

  return (
    <PageLayout>
      <VisionManager
        ref={vmRef}
        statusFilter={statusFilter}
        areaFilter={areaFilter}
      />
    </PageLayout>
  );
};

export default VisionPage;
