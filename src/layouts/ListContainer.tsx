import React from "react";
import Container from "./Container";

interface ListContainerProps {
  title: string;
  /** 是否隐藏头部（在外层已有标题/工具栏时使用） */
  hideHeader?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  contentClassName?: string;
  withTopBorder?: boolean;
  shadow?: boolean | "none" | "sm" | "md" | "lg";
  borderVariant?: "none" | "subtle";
  columns?: Array<{
    key: string;
    label: string;
    width?: string;
    align?: "left" | "center" | "right";
  }>;
}

const ListContainer: React.FC<ListContainerProps> = ({
  title,
  hideHeader,
  headerAction,
  children,
  emptyState,
  size = "md",
  className = "",
  contentClassName = "",
  withTopBorder = false,
  shadow = true,
  borderVariant = "none",
  columns,
}) => {
  const containerClasses = [
    withTopBorder ? "border-t-2 border-t-primary" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const resolvedShadow =
    typeof shadow === "string" ? shadow : shadow === false ? "none" : "md";

  const titleSizeClass =
    size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-sm";
  const contentClasses = `min-w-0 flex-1 text-sm ${contentClassName || "overflow-auto"}`;

  const getColumnAlignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  return (
    <Container
      className={containerClasses}
      borderVariant={borderVariant}
      shadow={resolvedShadow}
      overflow="hidden"
    >
      {!hideHeader && (
        <div className="px-4 py-3 border-b border-base-300">
          <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2
              className={`${titleSizeClass} min-w-0 break-words  text-base-content`}
            >
              {title}
            </h2>
            {headerAction && (
              <div className="min-w-0 flex-shrink-0 sm:ml-4">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      )}

      {columns && columns.length > 0 && (
        <div className="px-4 py-3 bg-primary/10 border-b border-primary/20">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: columns
                .map((col) => col.width || "1fr")
                .join(" "),
            }}
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className={`text-sm  text-base-content/70 ${getColumnAlignClass(column.align)}`}
              >
                {column.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={contentClasses}>{children || emptyState}</div>
    </Container>
  );
};

export default ListContainer;
