import React, {type JSX, useCallback, useMemo, useRef, useState} from "react";
import type {CellTemplate} from "../sheetStyle/workbookHolder.tsx";
import type {cellValue} from "./parseWorksheet.ts";
import type {FilterInstance, FormType} from "./plugins/CellParams.tsx";
import {Cell} from "./Cell.tsx";
import {cssPropertiesToString} from "../utils/cssConverter.ts"
import {TableVisibilityProvider} from "./TableVisibilityContext.tsx";

type CellDataExtra = {
  values: null | cellValue[];
  params: FormType,
  active: null | string,
  cssSelector: string,
  listeners: Set<() => void>
};
export type CellData = Readonly<Omit<CellTemplate, 'tdStyle' | 'contentStyle' | 'containerStyle'>> & CellDataExtra;
export type TableData = Record<string, CellData>;
export type TableParams = {
  filterMap?: boolean[];
}

export function Table() {
  const [tableCSS, setTableCSS] = useState<{
    css: string,
    selector: string
  }>({
    css: '',
    selector: ''
  });
  const tableData = useRef<TableData>({});
  const tableParams = useRef<TableParams>({});
  const [version, setVersion]   = useState<number>(0);
  const [schema,  setSchema]    = useState<{
    grid: {address: string}[][],
    id: string | null,
    totalCol: number,
    totalRow: number
  }>({ grid: [], id: null, totalCol: 0, totalRow: 0 });

  const changeSchema = useCallback((grid: CellTemplate[][], id: string | null, totalCol: number, totalRow: number) => {
    const next: TableData = {};
    const gClass = 's' + String(version);
    let cssSheet = '';
    for (const row of grid)
      for (const cell of row) {
        const {tdStyle, contentStyle, containerStyle, ...rest} = cell;
        const cssSelector = 'c' + cell.c + '_' + cell.r
        cssSheet += cssPropertiesToString(`.excel.${gClass} td.${cssSelector}`, tdStyle);
        cssSheet += cssPropertiesToString(`.excel.${gClass} .${cssSelector} .cell-container`, containerStyle);
        cssSheet += cssPropertiesToString(`.excel.${gClass} .${cssSelector} .cell-content`, contentStyle);
        const tmp: CellData = {
          ...rest,
          cssSelector,
          values: null,
          params: {},
          active: null,
          listeners: new Set(),
        };
        next[`${cell.c},${cell.r}`] = tmp;
        next[cell.address] = tmp;
      }

    tableData.current = next;
    tableParams.current = {};

    setTableCSS({
      css: cssSheet,
      selector: gClass
    })
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

  const applyFilters = useCallback((filters: Partial<FilterInstance>[], assumingLen: number) => {
    let maxLen = assumingLen ?? 0;
    const badIdx = new Set<number>();
    for(const filter of filters) {
      const {address, operator, operatorArg} = filter;
      if (address && operator) {
        const cell = getCell(address);
        if (!cell) continue;
        const {values} = cell;
        if (!values) continue;
        maxLen = Math.max(maxLen, values.length);
        const vals: cellValue[] = values;
        const ev = (op: typeof operator, arg2: typeof operatorArg): ((v: cellValue) => boolean) => {
          if (op === 'Empty') return (v) => v.t === 'z';
          if (op === 'NEmpty') return (v) => v.t !== 'z';
          const arg2Num = Number(arg2);
          const arg2Str = String(arg2);
          if (op === 'le')  return (v) => isNaN(v.v as number ?? 0) || Number(v.v ?? 0) <  arg2Num;
          if (op === 'leq') return (v) => isNaN(v.v as number ?? 0) || Number(v.v ?? 0) <= arg2Num;
          if (op === 'gr')  return (v) => isNaN(v.v as number ?? 0) || Number(v.v ?? 0) >  arg2Num;
          if (op === 'grq') return (v) => isNaN(v.v as number ?? 0) || Number(v.v ?? 0) >= arg2Num;
          if (op === 'eq')  return (v) => String(v.v) === arg2Str;
          if (op === 'neq') return (v) => String(v.v) !== arg2Str;
          if (op === 'SWith')  return (v) =>  String(v.v).startsWith(arg2Str);
          if (op === 'NSWith') return (v) => !String(v.v).startsWith(arg2Str);
          if (op === 'EWith')  return (v) =>  String(v.v).endsWith(arg2Str);
          if (op === 'NEWith') return (v) => !String(v.v).endsWith(arg2Str);
          if (op === 'Contain')  return (v) =>  String(v.v).includes(arg2Str);
          if (op === 'NContain')  return (v) => !String(v.v).includes(arg2Str);
          return () => true;
        }
        const evaluator = ev(operator, operatorArg);
        vals.forEach((v, idx) => {
          if (!evaluator(v)) badIdx.add(idx);
        })
      }
    }
    const filterMap = Array.from({length: maxLen}).map((v, idx) => !badIdx.has(idx));
    tableParams.current.filterMap = filterMap;
    setVersion(v => v + 1);
    return filterMap;
  }, []);

  const tableElement = useMemo<JSX.Element>(() => (
    <>
      <style type="text/css" key={tableCSS.selector}>{tableCSS.css}</style>
      <TableVisibilityProvider>
        <table className={"excel " + tableCSS.selector}>
          <tbody>
          {schema.grid.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map(cell => (
                <Cell
                  key={cell.address}
                  address={cell.address}
                  tableData={tableData}
                  tableParams={tableParams}
                  version={version}
                />
              ))}
            </tr>
          ))}
          </tbody>
        </table>
      </TableVisibilityProvider>
    </>
  ), [schema, version, tableCSS]);

  return {
    tableElement,
    schema,
    refreshAll,
    changeSchema,
    changeCell,
    getCell,
    applyFilters
  };
}
