import type {FileHolder} from "../ManageFiles/FileHolder.ts";
import * as XLSX from "xlsx";

const emptyWs: XLSX.WorkSheet = Object.freeze({});
export async function parseWorksheet(file: FileHolder | undefined, sheet: string, {totalCol, totalRow}: {totalCol: number, totalRow: number}): Promise<XLSX.WorkSheet> {
  if (!file) return emptyWs;
  const buffer = await file.file.arrayBuffer();
  const wb = XLSX.read(buffer, {
    type: 'array',
    cellFormula: true,
    cellHTML: false,
    cellNF: false,
    cellStyles: false,
    cellDates: false,
    dense: false,
    sheets: sheet,
    cellText: false,
    bookDeps: false,
    bookFiles: false,
    bookProps: false,
    bookSheets: false,
  });
  if (!wb) return emptyWs;
  const ws = wb.Sheets[sheet];
  if (!ws) return emptyWs;
  if (ws['!merges']) {
    for(const merge of ws['!merges']) {
      let {c: c1, r: r1} = merge.s;
      let {c: c2, r: r2} = merge.e;
      if (c1 > c2) [c1, c2] = [c2, c1];
      if (r1 > r2) [r1, r2] = [r2, r1];
      if (r1 > totalRow || c1 > totalCol) continue;
      r2 = Math.min(r2, totalRow);
      c2 = Math.min(c2, totalCol);
      const master = ws[XLSX.utils.encode_cell({ c: c1, r: r1 })];
      if (!master) continue;
      master.colSpan = c2 - c1 + 1;
      master.rowSpan = r2 - r1 + 1;
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++)
          ws[XLSX.utils.encode_cell({ c, r })] = master;
    }
  }
  return ws;
}

export type cellValue = XLSX.CellObject;

const nullCell: cellValue = Object.freeze({t: 'z'});
export function extractVals(wss: XLSX.WorkSheet[], address: string): cellValue[] | null {
  if (wss.length === 0 || address.charCodeAt(0) === 42 || address.charCodeAt(address.length - 1) === 42) //42 is *
    return null;
  return wss.map(ws => {
    const cell = ws?.[address];
    return (cell != null && cell.t !== undefined) ? cell : nullCell;
  });
}

