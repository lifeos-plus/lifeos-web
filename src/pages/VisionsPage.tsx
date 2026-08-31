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

const VisionPage: React.FC = () => {
  const { t } = useTranslation();
  const vmRef = useRef<VisionManagerHandle>(null);
  const { setHeader } = usePageHeader();

  // All visions (no status filter) powering the filter-option counts
  const { visions: allVisions } = useAllVisions();

  // Status filter state; undefined means "all"
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    "active",
  );
  const [areaFilter, setAreaFilter] = useState<
    UUID | null | undefined
  >(undefined);

  const visionsMatchingArea = useMemo(() => {
    if (areaFilter === undefined) {
      return allVisions;
    }
    if (areaFilter === null) {
      return allVisions.filter((vision) => !vision.area_id);
    }
    return allVisions.filter((vision) => vision.area_id === areaFilter);
  }, [allVisions, areaFilter]);

  const visionsMatchingStatus = useMemo(() => {
    if (statusFilter === undefined) {
      return allVisions;
    }
    return allVisions.filter((vision) => vision.status === statusFilter);
  }, [allVisions, statusFilter]);

  // Each facet applies the other facet before calculating its option counts.
  const statusOptions = useMemo(() => {
    const countsByStatus = new Map<string, number>();
    for (const vision of visionsMatchingArea) {
      countsByStatus.set(
        vision.status,
        (countsByStatus.get(vision.status) ?? 0) + 1,
      );
    }
    return buildCountedFilterOptions(
      VISION_STATUS_FILTER_OPTIONS,
      countsByStatus,
      { allLabel: t("common.all"), totalCount: visionsMatchingArea.length },
    );
  }, [t, visionsMatchingArea]);

  // Area counts are keyed by option id, including __all__ and __none__.
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [SelectorSpecialValue.All]: visionsMatchingStatus.length,
    };
    let noneCount = 0;
    for (const vision of visionsMatchingStatus) {
      if (vision.area_id) {
        counts[vision.area_id] = (counts[vision.area_id] ?? 0) + 1;
      } else {
        noneCount += 1;
      }
    }
    counts[SelectorSpecialValue.None] = noneCount;
    return counts;
  }, [visionsMatchingStatus]);

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
