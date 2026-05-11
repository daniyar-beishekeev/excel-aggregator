import type ExcelJS from "exceljs";
import type {CellStyle, workbookHolder} from "./workbookHolder.tsx";
import {parseColor} from "./color.ts";

export function parseFill (wb: workbookHolder, st: CellStyle, fill: ExcelJS.Fill) {
  if (fill.type === "pattern" && fill.pattern === "solid" && fill.fgColor)
    st.tdStyle.backgroundColor = parseColor(wb, fill.fgColor, 'fill');
}
