import React from "react";
import ActionButton from "@/components/ActionButton";
import { ActionButtonGroup } from "@/components/ActionButton";
import ErrorDisplay from "@/components/ErrorDisplay";
import Container from "./Container";

const getCardStyles = (size: string, className: string) => {
  const titleSizeClass =
    {
      sm: "text-sm",
      md: "text-sm",
      lg: "text-lg",
    }[size] || "text-sm";

  const buttonSize = ({
    sm: "sm",
    md: "md",
    lg: "lg",
  }[size] || "md") as "sm" | "md" | "lg";

  const containerClasses = [
    "flex flex-col",
    !className.includes("h-auto") ? "h-full" : "",
    !className.includes("mb-0") ? "mb-6" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return { titleSizeClass, buttonSize, containerClasses };
};

interface ContentAreaProps {
  children: React.ReactNode;
  loading: boolean;
  disabled: boolean;
  error?: string | null;
  overflowClassName: string;
  contentClassName?: string;
}

const ContentArea: React.FC<ContentAreaProps> = ({
  children,
  loading,
  disabled,
  error,
  overflowClassName,
  contentClassName = "",
}) => (
  <div
    className={`min-h-0 min-w-0 flex-1 ${overflowClassName} ${contentClassName}`.trim()}
  >
    <ErrorDisplay error={error ?? null} className="mb-4" />
    <div
      className={`${loading || disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      {children}
    </div>
  </div>
);

export interface CardAction {
  label: string;
  onClick?: () => void;
  color?: "primary" | "neutral" | "success" | "warning" | "error";
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface CardProps {
  /** 可为空；为空时不显示 Header 区域 */
  title?: string | React.ReactNode;
  description?: string;
  headerAction?: React.ReactNode;
  footerActions?: CardAction[];
  error?: string | null;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  withTopBorder?: boolean;
  size?: "sm" | "md" | "lg";
  /**
   * 质感等级 - 渐进式质感增强系统
   * - subtle: 基础质感，轻微增强（适用于密集布局）
   * - moderate: 中等质感，标准卡片（默认）
   * - elevated: 高级质感，焦点卡片（重要内容、悬浮状态）
   */
  elevation?: "subtle" | "moderate" | "elevated";
  contentOverflow?: "visible" | "auto" | "hidden" | "scroll";
  contentClassName?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  description,
  headerAction,
  footerActions = [],
  error,
  loading = false,
  disabled = false,
  className = "",
  children,
  withTopBorder = false,
  size = "md",
  elevation = "moderate",
  contentOverflow = "visible",
  contentClassName,
}) => {
  const { titleSizeClass, buttonSize, containerClasses } = getCardStyles(
    size,
    className,
  );

  const resolveContentOverflow = () => {
    switch (contentOverflow) {
      case "auto":
        return "overflow-y-auto overflow-x-hidden scrollbar-gutter-stable-both";
      case "scroll":
        return "overflow-y-scroll overflow-x-hidden scrollbar-gutter-stable-both";
      case "hidden":
        return "overflow-hidden";
      default:
        return "overflow-visible";
    }
  };

  return (
    <Container
      className={containerClasses}
      overflow="hidden"
      shadow={
        elevation === "subtle"
          ? "sm"
          : elevation === "elevated"
            ? "lg"
            : "md"
      }
    >
      {title ? (
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            {typeof title === "string" ? (
              <h3 className={`flex items-center gap-2 ${titleSizeClass}`}>{title}</h3>
            ) : (
              <div className={`flex items-center gap-2 ${titleSizeClass}`}>{title}</div>
            )}
            {description && <p className="text-sm mt-1">{description}</p>}
          </div>
          {headerAction && (
            <div className="flex-shrink-0 ml-4">{headerAction}</div>
          )}
        </div>
      ) : null}

      <ContentArea
        loading={loading}
        disabled={disabled}
        error={error}
        overflowClassName={resolveContentOverflow()}
        contentClassName={`${withTopBorder ? "border-t border-base-300 pt-4" : ""} ${
          contentClassName || ""
        }`.trim()}
      >
        {children}
      </ContentArea>

      {footerActions.length > 0 && (
        <div className="mt-4">
          {footerActions.length === 1 ? (
            <div className="card-actions justify-end">
              <ActionButton
                {...footerActions[0]}
                size={buttonSize}
                disabled={loading || disabled || footerActions[0].disabled}
              />
            </div>
          ) : (
            <ActionButtonGroup align="end" gap="md" className="justify-end">
              {footerActions.map((action, index) => (
                <ActionButton
                  key={index}
                  {...action}
                  size={buttonSize}
                  disabled={loading || disabled || action.disabled}
                />
              ))}
            </ActionButtonGroup>
          )}
        </div>
      )}
    </Container>
  );
};

export default Card;
