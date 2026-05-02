import ExcelJS from "exceljs";
import {type color} from "./indexedColors.ts"
import {extractThemeColors} from "./indexedColors.ts";
import type {FileHolder} from "../ManageFiles/FileHolder.ts";
import {type CSSProperties, type JSX} from "react";
import {CellTag} from "./CellTag.tsx";
import {formatDate} from "../global/formatDate.ts";

import {parseAlignment} from "./alignment.ts";
import {parseFill} from "./fill.ts";
import {parseFont} from "./font.ts";
import {parseBorder} from "./border.ts";

export interface CellStyle {
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

export class workbookHolder{
  private readonly wb: ExcelJS.Workbook;
  public readonly id: string;
  public readonly themeColors: color[];
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
  public cellRange(cell: ExcelJS.Cell): ExcelJS.Location {
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
    parseBorder(this, st, cell);
    parseAlignment(this, st, cell.alignment ?? {});
    parseFill(this, st, cell.fill ?? {});
    parseFont(this, st.containerStyle, cell.font ?? {});
    return st;
  }
  private renderComment (cell: ExcelJS.Cell): JSX.Element | null {
    if (!cell.note) return null;
    if (typeof cell.note === 'string')
      return <CellTag><span>{cell.note}</span></CellTag>
    if (!cell.note.texts) return null;
    return <CellTag>
      {cell.note.texts.map((en: ExcelJS.RichText) => {
        const style: CSSProperties = {};
        parseFont(this, style, en.font ?? {})
        return <span style={style}>{en.text}</span>
      })}
    </CellTag>
  }
  private getHTMLValue (cell: ExcelJS.Cell) {
    const v = cell.value;
    if (v != null && typeof v === 'object' && 'richText' in v) {
      return (
        <>
          {v.richText.map((en: ExcelJS.RichText, i: number) => {
            const style = {};
            parseFont(this, style, en.font ?? {});
            return <span key={i} style={style}>{en.text}</span>
          })}
        </>
      );
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
    if ('richText' in v) return v.richText.map((en: ExcelJS.RichText) => en.text).join('')
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
}
