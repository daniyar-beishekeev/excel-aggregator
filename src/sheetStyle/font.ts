import type {AllowedCSS, workbookHolder} from "./workbookHolder.tsx";
import type ExcelJS from "exceljs";
import {parseColor} from "./color.ts";

export function parseFont (wb: workbookHolder, style: AllowedCSS, font: Partial<ExcelJS.Font>) {
  const f = font;
  if (f.name) style.fontFamily = f.name;
  if (f.size) style.fontSize = `calc(${f.size * 1.3333}px * var(--excelZoom))`;
  if (f.bold) style.fontWeight = "bold";
  if (f.italic) style.fontStyle = "italic";
  if (f.underline) style.textDecoration = "underline";
  if (f.strike) style.textDecoration = "line-through";
  if (f.color) style.color = parseColor(wb, f.color, 'font');
}
