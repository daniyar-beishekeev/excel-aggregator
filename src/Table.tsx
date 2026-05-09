import React, {type JSX, useCallback, useMemo, useRef, useState} from "react";
import type {CellTemplate} from "./sheetStyle/workbookHolder.tsx";
import type { cellValue } from "./sheetData/parseWorksheet.ts";
import type {FormType} from "./CellParams.tsx";
import {Cell} from "./Cell.tsx";

type CellDataExtra = {
  values: null | cellValue[];
  params: FormType,
  active: null | string,
  listeners: Set<() => void>
};
export type CellData = Readonly<CellTemplate> & CellDataExtra;
export type TableData = Record<string, CellData>;

export function Table() {
  const tableData = useRef<TableData>({});
  const [version, setVersion]   = useState<number>(0);
  const [schema,  setSchema]    = useState<{
    grid: {address: string}[][],
    id: string | null,
    totalCol: number,
    totalRow: number
  }>({ grid: [], id: null, totalCol: 0, totalRow: 0 });

  const changeSchema = useCallback((grid: CellTemplate[][], id: string | null, totalCol: number, totalRow: number) => {
    const next: TableData = {};
    for (const row of grid)
      for (const cell of row) {
        const tmp: CellData = {
          ...cell,
          values: null,
          params: {},
          active: null,
          listeners: new Set(),
        };
        next[`${cell.c},${cell.r}`] = tmp;
        next[cell.address] = tmp;
      }

    tableData.current = next;

    setSchema({
      grid: grid.map(r => r.map(c => ({ address: c.address }))),
      id, totalRow, totalCol,
    });
    setVersion(v => v + 1);
  }, []);

  const changeCell = useCallback((address: string, patch: Partial<CellDataExtra>, refresh: boolean = true) => {
    const cell = tableData.current[address];
    if (!cell) return;
    Object.assign(cell, patch);
    if (refresh)
      cell.listeners.forEach(l => l());
  }, []);

  const refreshAll = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  const getCell = useCallback((address: string): CellData | undefined => {
    return tableData.current[address];
  }, []);

  const tableElement = useMemo<JSX.Element>(() => (
    <table className="excel">
      <tbody>
      {schema.grid.map((row, rowIdx) => (
        <tr key={rowIdx}>
          {row.map(cell => (
            <Cell
              key={cell.address}
              address={cell.address}
              tableData={tableData}
              version={version}
            />
          ))}
        </tr>
      ))}
      </tbody>
    </table>
  ), [schema, version]);

  return {
    tableElement,
    schema,
    refreshAll,
    changeSchema,
    changeCell,
    getCell
  };
}
