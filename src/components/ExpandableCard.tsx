import React, { type ReactNode } from "react";
import Container from "@/layouts/Container";
import { ExpandButton } from "./ActionButton";

interface ExpandableCardProps {
  isExpanded: boolean;
  onToggleExpansion: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  subtitleAlign?: "start" | "center" | "end" | "between";
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  /**
   * 质感等级 - 渐进式质感增强系统
   * - subtle: 基础质感，轻微增强（适用于密集布局）
   * - moderate: 中等质感，标准卡片（默认）
   * - elevated: 高级质感，焦点卡片（重要内容、悬浮状态）
   */
  elevation?: "subtle" | "moderate" | "elevated";
}

const ExpandableCard: React.FC<ExpandableCardProps> = ({
  isExpanded,
  onToggleExpansion,
  title,
  subtitle,
  subtitleAlign = "end",
  children,
  className = "",
  disabled = false,
  elevation = "moderate",
}) => {
  const containerClasses = [
    "w-full",
    "h-fit",
    "min-w-0",
    "overflow-hidden",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const headerClasses = "p-3 sm:p-4 lg:p-6 cursor-pointer";
  const contentClasses = "w-full overflow-hidden";

  return (
    <Container
      className={containerClasses}
      overflow="hidden"
      maxHeight="fit"
      padding="none"
      shadow={
        elevation === "subtle"
          ? "sm"
          : elevation === "elevated"
            ? "lg"
            : "md"
      }
    >
      <div
        className={headerClasses}
        onClick={disabled ? undefined : onToggleExpansion}
      >
        <div className="w-full flex items-start gap-2 sm:gap-3 min-w-0">
          <ExpandButton
            isExpanded={isExpanded}
            onClick={onToggleExpansion}
            className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-1 hidden sm:block"
            disabled={disabled}
          />

          <div className="min-w-0 flex-1">
            <div className="min-w-0">{title}</div>

            {subtitle && (
              <div
                className={`mt-2 sm:mt-3 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-${subtitleAlign}`}
              >
                {subtitle}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 隐藏时完全不渲染，避免占位 */}
      {isExpanded ? <div className={contentClasses}>{children}</div> : null}
    </Container>
  );
};

export default ExpandableCard;
