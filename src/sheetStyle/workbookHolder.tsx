import ExcelJS from "exceljs";
import {type CSSProperties, type JSX} from "react";
import * as XLSX from "xlsx";

import type {FileHolder} from "../ManageFiles/FileHolder.ts";
import {CellTag} from "./CellTag.tsx";
import {formatDate} from "../global/formatDate.ts";

import {type color} from "./indexedColors.ts"
import {extractThemeColors} from "./indexedColors.ts";
import {parseAlignment} from "./alignment.ts";
import {parseFill} from "./fill.ts";
import {parseFont} from "./font.ts";
import {parseBorder} from "./border.ts";

import './general.css'

export interface CellStyle {
  readonly tdStyle: CSSProperties;
  readonly containerStyle: CSSProperties;
  readonly contentStyle: CSSProperties;
}

export interface CellTemplate extends CellStyle{
  readonly address: string;
  readonly r: number;
  readonly c: number;
  readonly rowSpan: number;
  readonly colSpan: number;
  w: number;
  h: number;
  classList?: string | undefined;

  readonly comment?: JSX.Element | null | undefined;
  readonly htmlContent: any;
}

interface workbookHolderProps {
  readonly id: string;
  getGridTemplate: (sheetName: string) => CellTemplate[][];
  worksheetSize: (sheetName: string) => {totalRow: number; totalCol: number};
}

export async function createWorkbookHolder (file: FileHolder): Promise<workbookHolderProps> {
  const rawBuffer: ArrayBuffer = await file.file.arrayBuffer();
  let arrayBuffer: ArrayBuffer
    = file.file.name.endsWith(".xlsx")
    ? rawBuffer
    : XLSX.write(
      XLSX.read(rawBuffer, { type: "array" }),
      { bookType: "xlsx", type: "array" }
    );

  const wb: ExcelJS.Workbook = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  return new workbookHolder(wb, file.id);
}

export class workbookHolder implements workbookHolderProps{
  private readonly wb: ExcelJS.Workbook;
  public readonly id: string;
  public readonly themeColors: color[];
  constructor(wb: ExcelJS.Workbook, id: string) {
    this.wb = wb;
    this.id = id;
    this.themeColors = extractThemeColors(wb.model.themes);
  }
  public getGridTemplate(sheetName: string): CellTemplate[][] {
    const ws = this.wb.getWorksheet(sheetName);
    const rows: CellTemplate[][] = [];
    if (!ws) return rows;
    const {totalRow, totalCol} = this._worksheetSize(ws);

    const heightPref: number[] = Array.from({length: totalRow + 1}, () => 0);
    const widthPref: number[] = Array.from({length: totalCol + 1}, () => 0);
    for (let rowNum = 1; rowNum <= totalRow; rowNum++) heightPref[rowNum] = heightPref[rowNum - 1]! + this.getHeight(ws.getRow(rowNum));
    for (let colNum = 1; colNum <= totalCol; colNum++) widthPref[colNum] = widthPref[colNum - 1]! + this.getWidth(ws.getColumn(colNum));

    //ADD ROW INDEX
    {
      const cells: CellTemplate[] = [];
      {
        //ADD GLOBAL INDEX
        cells.push({
          r: -1, c: -1,
          address: '**',
          colSpan: 1,
          rowSpan: 1,
          w: 0, h: 0,
          tdStyle: {},
          contentStyle: {},
          containerStyle: {},
          classList: 'columnHeader rowHeader',
          htmlContent: null
        })
        for (let colNum = 1; colNum <= totalCol; colNum++) {
          const col = ws.getColumn(colNum);
          //ADD COLUMN INDEX
          cells.push({
            r: -1, c: colNum,
            address: col.letter + '*',
            colSpan: 1,
            rowSpan: 1,
            w: 0, h: 0,
            tdStyle: {},
            contentStyle: {},
            containerStyle: {},
            classList: 'rowHeader',
            htmlContent: col.letter
          })
        }
      }
      rows.push(cells);
    }

    for (let rowNum = 1; rowNum <= totalRow; rowNum++) {
      const row: ExcelJS.Row = ws.getRow(rowNum);
      const cells: CellTemplate[] = [];
      {
        //ADD COLUMN INDEX
        cells.push({
          r: rowNum, c: -1,
          address: '*' + String(rowNum),
          colSpan: 1,
          rowSpan: 1,
          w: 0, h: 0,
          tdStyle: {},
          contentStyle: {},
          containerStyle: {},
          classList: 'columnHeader',
          htmlContent: String(rowNum)
        })
      }
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
        st.containerStyle.minWidth = w;
        st.contentStyle.maxWidth = w;

        st.containerStyle.height = h;
        cells.push({
          r: rowNum, c: colNum,
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
  private _worksheetSize (ws: ExcelJS.Worksheet): {totalRow: number, totalCol: number} {
    let totalRow: number = ws.rowCount, totalCol: number = ws.columnCount;
    while (ws.getRow(totalRow).actualCellCount === 0) totalRow--;
    while (ws.getColumn(totalCol).values.length === 0) totalCol--;
    return {
      totalCol,
      totalRow
    };
  }
  public worksheetSize (sheetName: string): {totalRow: number, totalCol: number} {
    const ws = this.wb.getWorksheet(sheetName);
    if (!ws) return {totalRow: 0, totalCol: 0};
    return this._worksheetSize(ws);
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
    let r = workbookHolder.getRawValue(cell);
    if (r instanceof Date) r = formatDate({d: r});
    return r;
  }
  public static getRawValue (cell: ExcelJS.Cell): null | string | number | Date | boolean{
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
