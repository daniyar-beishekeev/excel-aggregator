import type {AllowedCSS, CellStyle, workbookHolder} from "./workbookHolder.tsx";
import type ExcelJS from "exceljs";
import {parseColor} from "./color.ts";

function borderMapStyle(xmlName: string | undefined): NonNullable<AllowedCSS['border']> {
  switch (xmlName) {
    case "thin":
    case "hair":
      return "1px solid";
    case "medium":
    case "mediumDashDot":
    case "mediumDashDotDot":
      return "2px solid";
    case "thick":
      return "3px solid";
    case "double":
      return "3px double";
    case "dotted":
      return "1px dotted";
    case "dashDot":
    case "dashDotDot":
    case "slantDashDot":
    case "mediumDashed":
      return "1px dashed";
    default:
      return "1px solid";
  }
}

const propsList: [keyof ExcelJS.Borders, "borderTop" | "borderLeft" | "borderBottom" | "borderRight"][]
  = [["top", "borderTop"],
  ["left", "borderLeft"],
  ["bottom", "borderBottom"],
  ["right", "borderRight"]];

export function parseBorder (wb: workbookHolder, st: CellStyle, cell: ExcelJS.Cell) {
  let leftTopCell: ExcelJS.Cell = cell, rightBottomCell: ExcelJS.Cell = cell;
  if (cell.isMerged) {
    const ws: ExcelJS.Worksheet = cell.worksheet;
    const range = wb.cellRange(cell);
    leftTopCell = ws.getRow(range.top).getCell(range.left);
    rightBottomCell = ws.getRow(range.bottom).getCell(range.right);
  }
  const all: Partial<ExcelJS.Borders> = {
    ...(leftTopCell.border ?? {}),
    ...(rightBottomCell.border ?? {}),
    ...(cell.border ?? {})
  };
  propsList.forEach(([side, cssProp]) => {
    if (all[side]) {
      st.tdStyle[cssProp] = `${borderMapStyle(all[side].style)} ${parseColor(wb, all[side].color, 'border')}`;
    }
  });
}
