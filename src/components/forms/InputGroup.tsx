import React from "react";

interface InputGroupProps {
  align?: "start" | "center" | "end";
  wrap?: boolean;
  className?: string;
  children: React.ReactNode;
}

const InputGroup: React.FC<InputGroupProps> = ({
  align = "start",
  wrap = true,
  className = "",
  children,
}) => {
  const alignmentClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
  };

  const baseClasses = `flex flex-col sm:flex-row gap-2 ${alignmentClasses[align]}`;
  const flexClasses = wrap ? "" : "flex-nowrap";
  const finalClasses = `${baseClasses} ${flexClasses} ${className}`;

  return <div className={finalClasses}>{children}</div>;
};

export default InputGroup;
