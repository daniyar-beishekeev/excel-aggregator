import type {workbookHolder} from "./workbookHolder.tsx";
import type ExcelJS from "exceljs";
import type {CSSProperties} from "react";
import {parseColor} from "./color.ts";

export function parseFont (wb: workbookHolder, style: CSSProperties, font: Partial<ExcelJS.Font>) {
  const f = font;
  if (f.name) style.fontFamily = f.name;
  if (f.size) style.fontSize = `${f.size * 1.3333}px`;
  if (f.bold) style.fontWeight = "bold";
  if (f.italic) style.fontStyle = "italic";
  if (f.underline) style.textDecoration = "underline";
  if (f.strike) style.textDecoration = "line-through";
  if (f.color) style.color = parseColor(wb, f.color, 'font');
}
