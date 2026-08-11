export const DEFAULT_AREA_COLOR = "#70747B";
export const UNKNOWN_AREA_COLOR = "#A1A4AA";
export const DEFAULT_NEW_AREA_COLOR = "#6A8DC7";

export const AREA_COLOR_PALETTE = [
  DEFAULT_NEW_AREA_COLOR,
  "#3A8F73",
  "#BB8F45",
  "#9A82D0",
  "#C46F6F",
  "#C07D4F",
  "#3A92A1",
  "#7B9F43",
  "#C3719A",
  "#8688CE",
] as const;

const parseHexColor = (color: string) => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  if (!match) return null;
  return [
    Number.parseInt(match[1], 16),
    Number.parseInt(match[2], 16),
    Number.parseInt(match[3], 16),
  ] as const;
};

export const getReadableTextColor = (backgroundColor: string): string => {
  const rgb = parseHexColor(backgroundColor);
  if (!rgb) return "#111827";

  const [red, green, blue] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return luminance > 0.179 ? "#111827" : "#FFFFFF";
};
