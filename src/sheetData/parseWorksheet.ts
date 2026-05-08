import type {FileHolder} from "../ManageFiles/FileHolder.ts";
import * as XLSX from "xlsx";

const emptyWs: XLSX.WorkSheet = Object.freeze({});
export async function parseWorksheet(file: FileHolder | undefined, sheet: string): Promise<XLSX.WorkSheet> {
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
  return ws;
}

type cellValue = XLSX.CellObject;

const nullCell: cellValue = Object.freeze({t: 'z'});
export function extractVals(wss: XLSX.WorkSheet[], address: string): cellValue[] | null {
  if (wss.length === 0 || address.charCodeAt(0) === 42 || address.charCodeAt(address.length - 1) === 42) //42 is *
    return null;
  return wss.map(ws => {
    const cell = ws?.[address];
    return (cell != null && cell.t !== undefined) ? cell : nullCell;
  });
}

