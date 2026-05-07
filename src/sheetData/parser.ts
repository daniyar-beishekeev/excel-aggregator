import * as XLSX from "xlsx";

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
