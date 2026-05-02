import ExcelJS from "exceljs";
import {applyTint, type color, indexedColors} from "./indexedColors.ts"
import {extractThemeColors} from "./indexedColors.ts";
import type {FileHolder} from "../ManageFiles/FileHolder.ts";
import {type CSSProperties, type JSX} from "react";
import {CellTag} from "./CellTag.tsx";
import {formatDate} from "../global/formatDate.ts";

type textOrientation = "horizontal" | "vertical";

interface CellStyle {
  tdStyle: CSSProperties;
  containerStyle: CSSProperties;
  contentStyle: CSSProperties;
}

export interface CellTemplate extends CellStyle{
  address: string;
  rowSpan: number;
  colSpan: number;
  w: number;
  h: number;

  comment?: JSX.Element | null | undefined;
  htmlContent: any;
}

function borderMapStyle(xmlName: string | undefined): NonNullable<CSSProperties['border']> {
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

function horizontalAlignmentParse(st: CellStyle, hor: ExcelJS.Alignment['horizontal']): void {
  switch (hor) {
    case "justify":
    case "distributed":
    case "left":
    case "fill":
      st.containerStyle.justifyContent = "flex-start";
      st.contentStyle.textAlign = "left";
      break;
    case "center":
    case "centerContinuous":
      st.containerStyle.justifyContent = "center";
      st.contentStyle.textAlign = "center";
      break;
    case "right":
      st.containerStyle.justifyContent = "flex-end";
      st.contentStyle.textAlign = "right";
      break;
  }
}

function verticalAlignmentParse(st: CellStyle, ver: ExcelJS.Alignment['vertical']): void {
  switch (ver) {
    case "top":
      st.containerStyle.alignItems = "flex-start";
      st.contentStyle.alignItems = "flex-start";
      break;
    case "middle":
      st.containerStyle.alignItems = "center";
      st.contentStyle.alignItems = "center";
      break;
    case "bottom":
      st.containerStyle.alignItems = "flex-end";
      st.contentStyle.alignItems = "flex-end";
      break;
    case "justify":
    case "distributed":
      st.containerStyle.alignItems = "stretch";
      st.contentStyle.alignItems = "stretch";
      break;
  }
}

export class workbookHolder{
  private readonly wb: ExcelJS.Workbook;
  public readonly id: string;
  private readonly themeColors: color[];
  constructor(wb: ExcelJS.Workbook, id: string) {
    this.wb = wb;
    this.id = id;
    this.themeColors = extractThemeColors(wb.model.themes);
  }
  public static async create(file: FileHolder) {
    const wb: ExcelJS.Workbook = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.file.arrayBuffer());
    return new workbookHolder(wb, file.id);
  }
  public getGridTemplate(sheetName: string): CellTemplate[][] {
    const ws = this.wb.getWorksheet(sheetName);
    const rows: CellTemplate[][] = [];
    if (!ws) return rows;
    const {totalRow, totalCol} = this.worksheetSize(ws);

    const heightPref: number[] = Array.from({length: totalRow + 1}, () => 0);
    const widthPref: number[] = Array.from({length: totalCol + 1}, () => 0);
    for (let rowNum = 1; rowNum <= totalRow; rowNum++) heightPref[rowNum] = heightPref[rowNum - 1]! + this.getHeight(ws.getRow(rowNum));
    for (let colNum = 1; colNum <= totalCol; colNum++) widthPref[colNum] = widthPref[colNum - 1]! + this.getWidth(ws.getColumn(colNum));
    for (let rowNum = 1; rowNum <= totalRow; rowNum++) {
      const row: ExcelJS.Row = ws.getRow(rowNum);
      const cells: CellTemplate[] = [];
      for (let colNum = 1; colNum <= totalCol; colNum++) {
        const cell = row.getCell(colNum);
        const range = this.cellRange(cell);
        if(cell.master !== cell) {
          colNum = range.right;
          continue;
        }
        const st: CellStyle = this.parseStyle(cell);
        const w: number = widthPref[range.right]! - widthPref[range.left - 1]!;
        const h: number = heightPref[range.bottom]! - heightPref[range.top - 1]!;
        st.containerStyle.width = w;
        st.containerStyle.height = h;
        cells.push({
          address: cell.address,
          colSpan: range.right - range.left + 1,
          rowSpan: range.bottom - range.top + 1,
          w, h,
          ...st,
          comment: this.renderComment(cell),
          htmlContent: this.getHTMLValue(cell)
        })
      }
      rows.push(cells);
    }
    return rows;
  }
  /**
   * In pixels
   */
  private getHeight (row: ExcelJS.Row): number {
    return Math.ceil((row.height ?? row.worksheet.properties.defaultRowHeight ?? 15) * 1.3333);
  }
  /**
   * In pixels
   */
  private getWidth (col: ExcelJS.Column): number {
    return Math.ceil(((col.width ?? col.worksheet.properties.defaultColWidth ?? 8.43) * 7 + 5));
  }
  private worksheetSize (ws: ExcelJS.Worksheet): {totalRow: number, totalCol: number} {
    let totalRow: number = ws.rowCount, totalCol: number = ws.columnCount;
    while (ws.getRow(totalRow).actualCellCount === 0) totalRow--;
    while (ws.getColumn(totalCol).values.length === 0) totalCol--;
    return {
      totalCol,
      totalRow
    };
  }
  private cellRange(cell: ExcelJS.Cell): ExcelJS.Location {
    if (cell.isMerged) {
      //@ts-expect-error
      return cell.worksheet._merges[cell.master.address] as ExcelJS.Location;
    }
    return {
      left: cell.fullAddress.col, right: cell.fullAddress.col,
      top: cell.fullAddress.row, bottom: cell.fullAddress.row
    };
  }
  private parseStyle(cell: ExcelJS.Cell): CellStyle {
    const st: CellStyle = {
      tdStyle: {},
      containerStyle: {},
      contentStyle: {}
    }
    this.parseBorder(st, cell);
    this.parseAlignment(st, cell.alignment ?? {});
    this.parseFill(st, cell.fill ?? {});
    this.parseFont(st.containerStyle, cell.font ?? {});
    return st;
  }
  private parseBorder (st: CellStyle, cell: ExcelJS.Cell) {
    let leftTopCell: ExcelJS.Cell = cell, rightBottomCell: ExcelJS.Cell = cell;
    if (cell.isMerged) {
      const ws: ExcelJS.Worksheet = cell.worksheet;
      const range = this.cellRange(cell);
      leftTopCell = ws.getRow(range.top).getCell(range.left);
      rightBottomCell = ws.getRow(range.bottom).getCell(range.right);
    }
    const all: Partial<ExcelJS.Borders> = {
      ...(leftTopCell.border ?? {}),
      ...(rightBottomCell.border ?? {}),
      ...(cell.border ?? {})
    };
    const propsList: [keyof ExcelJS.Borders, "borderTop" | "borderLeft" | "borderBottom" | "borderRight"][]
      = [["top", "borderTop"],
        ["left", "borderLeft"],
        ["bottom", "borderBottom"],
        ["right", "borderRight"]];
    propsList.forEach(([side, cssProp]) => {
      if (all[side]) {
        st.tdStyle[cssProp] = `${borderMapStyle(all[side].style)} ${this.parseColor(all[side].color, 'border')}`;
      }
    });
  }
  private parseAlignment (st: CellStyle, alignment: Partial<ExcelJS.Alignment>) {
    const deg = alignment?.textRotation;
    let orientation: textOrientation = 'horizontal';
    if (deg === 90) {
      orientation = 'vertical';
      st.contentStyle.writingMode = "sideways-lr";
    }

    if (alignment?.wrapText) {
      st.contentStyle.whiteSpace = "pre-wrap";
      st.contentStyle.overflow = "hidden";
    }

    if (alignment.horizontal)
      horizontalAlignmentParse(st, alignment.horizontal)

    if (alignment.vertical)
      verticalAlignmentParse(st, alignment.vertical)

    // INDENT (approximation)
    let indent: number = 0.375;
    if (typeof alignment?.indent === "number")
      indent = alignment.indent;
    indent = indent * 8 / 14;
    if (orientation === "horizontal") {
      if (st.contentStyle.textAlign === 'right')
        st.containerStyle.paddingRight = `${indent}em`;
      else
        st.containerStyle.paddingLeft = `${indent}em`;
    } else {
      if (st.contentStyle.alignItems === 'flex-end')
        st.containerStyle.paddingBottom = `${indent}em`;
      else
        st.containerStyle.paddingTop = `${indent}em`;
    }

    // SHRINK TO FIT
    if (alignment?.shrinkToFit) {
      st.contentStyle.minWidth = 0;
      st.contentStyle.flexShrink = 1;
    }

    // READING ORDER
    if (alignment?.readingOrder === "rtl") {
      st.contentStyle.direction = "rtl";
    } else if (alignment?.readingOrder === "ltr") {
      st.contentStyle.direction = "ltr";
    }
  }
  private renderComment (cell: ExcelJS.Cell): JSX.Element | null {
    if (!cell.note) return null;
    if (typeof cell.note === 'string')
      return <CellTag><span>{cell.note}</span></CellTag>
    if (!cell.note.texts) return null;
    return <CellTag>
      {cell.note.texts.map((en: ExcelJS.RichText) => {
        const style: CSSProperties = {};
        this.parseFont(style, en.font ?? {})
        return <span style={style}>{en.text}</span>
      })}
    </CellTag>
  }
  private getHTMLValue (cell: ExcelJS.Cell) {
    const v = cell.value;
    if (v != null && typeof v === 'object' && 'richText' in v) {
      const value = v.richText.map((en: ExcelJS.RichText) => {
        const style = {};
        this.parseFont(style, en.font ?? {})
        return en.text.split('\n').map((text, idx) => {
          return (
            <>
              {idx > 0 && <br/>}
              <span style={style}>{text}</span>
            </>
          )
        })
      })
      return <div>{value}</div>;
    }
    let r = this.getRawValue(cell);
    if (r instanceof Date) r = formatDate({d: r});
    return r;
  }
  private getRawValue (cell: ExcelJS.Cell) {
    const v = cell.value;
    //type CellValue =
    // 	| null | number | string | boolean | Date | undefined
    // 	| CellErrorValue
    // 	| CellRichTextValue | CellHyperlinkValue
    // 	| CellFormulaValue | CellSharedFormulaValue;
    if (v == null) return null;
    //TODO: Optimize via type guard
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v instanceof Date) return v;
    if ('error' in v) return v.error;
    if ('richText' in v) return v.richText.map((en: ExcelJS.RichText) => en.text).join(' ')
    if ('formula' in v || 'sharedFormula' in v) {
      //FORMULA VALUE RESOLVER
      const r = v.result;
      if (r == null) return null;
      if (typeof r === 'string' || typeof r === 'number' || typeof r === 'boolean' || r instanceof Date) return r;
      return r.error;
      //FORMULA RESOLVER
      //return 'formula' in v ? '=' + v.formula : '=@' + v.sharedFormula;
    }
    if ('text' in v) return v.text;
    console.error("Unable to parse cell value", cell);
    throw new Error("Unable to parse cell value");
  }
  private parseColor (obj: Partial<ExcelJS.Color> | undefined, context: 'font' | 'border' | 'fill' = 'font'): NonNullable<CSSProperties['color']> {
    const def: CSSProperties['color'] = '#000';
    if (!obj) return def;
    if (obj.argb && typeof obj.argb === 'string') {
      const hex = obj.argb.padStart(8, 'F');
      const a = hex.slice(0, 2);
      const r = hex.slice(2, 4);
      const g = hex.slice(4, 6);
      const b = hex.slice(6, 8);

      const alpha = parseInt(a, 16) / 255;
      if (alpha === 0) return context === 'fill' ? 'transparent' : def;
      if (alpha < 1) return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`;
      return `#${r}${g}${b}`;
    }
    //@ts-expect-error
    const idx: number | undefined = obj.indexed;
    if (idx != null) {
      if (idx === 64) return context === 'fill' ? 'transparent' : def;
      if (idx === 65) return def;
      if (indexedColors[idx]) return indexedColors[idx];
      return def;
    }
    if (obj.theme != null && this.themeColors[obj.theme]) {
      //@ts-expect-error
      const tint: number | undefined = obj.tint;
      if (tint)
        return applyTint(this.themeColors[obj.theme], tint);
      else{
        // Special case, FIXME
        if (context === 'font' && obj.theme === 0)return '#fff';
        return context === 'fill' ? 'transparent' : def;
      }
    }
    return def;
  }
  private parseFont (style: CSSProperties, font: Partial<ExcelJS.Font>) {
    const f = font;
    if (f.name) style.fontFamily = f.name;
    if (f.size) style.fontSize = `${f.size * 1.3333}px`;
    if (f.bold) style.fontWeight = "bold";
    if (f.italic) style.fontStyle = "italic";
    if (f.underline) style.textDecoration = "underline";
    if (f.strike) style.textDecoration = "line-through";
    if (f.color) style.color = this.parseColor(f.color, 'font');
  }
  private parseFill (st: CellStyle, fill: ExcelJS.Fill) {
    if (fill.type === "pattern" && fill.pattern === "solid" && fill.fgColor)
      st.containerStyle.backgroundColor = this.parseColor(fill.fgColor, 'fill');
  }
}
