import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import ActionButton from "@/components/ActionButton";
import ToolbarContainer from "@/components/ToolbarContainer";
import { usePageHeader } from "@/contexts/PageHeaderContext";
import { BodyMeasurementWorkspace } from "@/features/health/BodyMeasurementWorkspace";
import { MenstrualWorkspace } from "@/features/health/MenstrualWorkspace";
import { SleepWorkspace } from "@/features/health/SleepWorkspace";
import {
  DEFAULT_HEALTH_TAB,
  HEALTH_TOOLBAR_ORDER,
  type HealthTab,
} from "@/features/health/utils";
import PageLayout from "@/layouts/PageLayout";

function HealthPage() {
  const { t } = useTranslation();
  const { setHeader } = usePageHeader();
  const [activeTab, setActiveTab] = useState<HealthTab>(DEFAULT_HEALTH_TAB);

  useEffect(() => {
    setHeader({
      title: t("health.title"),
      subtitle: t("health.subtitle"),
    });
    return () => setHeader({ title: undefined, subtitle: undefined, actions: undefined });
  }, [setHeader, t]);

  return (
    <PageLayout>
      <ToolbarContainer className="mb-6" padding="sm">
        <div className="flex flex-wrap items-center gap-2">
          {HEALTH_TOOLBAR_ORDER.map((tab) => (
            <ActionButton
              key={tab}
              label={t(`health.tabs.${tab}`)}
              onClick={() => setActiveTab(tab)}
              color={activeTab === tab ? "primary" : "neutral"}
              variant={activeTab === tab ? "solid" : "ghost"}
              size="sm"
              className="shrink-0 px-3"
            />
          ))}
        </div>
      </ToolbarContainer>

      {activeTab === "menstrual" ? (
        <MenstrualWorkspace />
      ) : activeTab === "body" ? (
        <BodyMeasurementWorkspace />
      ) : (
        <SleepWorkspace />
      )}
    </PageLayout>
  );
}

export default HealthPage;
