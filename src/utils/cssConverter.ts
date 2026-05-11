import type {AllowedCSSKeys, CellStyle} from "../sheetStyle/workbookHolder.tsx";
import type {CSSProperties} from "react";

const PROPERTY_MAP: Record<AllowedCSSKeys, string> = {
  justifyContent: "justify-content",
  textAlign: "text-align",
  alignItems: "align-items",
  writingMode: "writing-mode",
  whiteSpace: "white-space",
  overflow: "overflow",
  paddingRight: "padding-right",
  paddingLeft: "padding-left",
  paddingBottom: "padding-bottom",
  paddingTop: "padding-top",
  minWidth: "min-width",
  flexShrink: "flex-shrink",
  direction: "direction",
  borderRight: "border-right",
  borderLeft: "border-left",
  borderBottom: "border-bottom",
  borderTop: "border-top",
  backgroundColor: "background-color",
  border: "border",
  color: "color",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontWeight: "font-weight",
  fontStyle: "font-style",
  textDecoration: "text-decoration",
};

const UNITLESS = new Set<AllowedCSSKeys>([
  "flexShrink",
  "fontWeight",
]);

export function cssPropertiesToString(selector: string, styles: Pick<CSSProperties, AllowedCSSKeys>): string {
  const res = Object.entries(styles)
    .filter(([, value]) => value != null)
    .map(([key, value]) => {
      const typedKey = key as AllowedCSSKeys;
      const finalValue =
        typeof value === "number" && !UNITLESS.has(typedKey)
          ? `${value}px`
          : String(value);
      if (finalValue == null)
        debugger;
      return `${PROPERTY_MAP[typedKey]}: ${finalValue};`;
    })
    .join(" ");
  return selector + "{" + res + "}\n";
}
