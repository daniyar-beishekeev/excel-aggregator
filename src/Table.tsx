import React, {type JSX, useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {CellTemplate} from "./sheetStyle/workbookHolder.tsx";
import type { cellValue } from "./sheetData/parseWorksheet.ts";
import type {FormType} from "./CellParams.tsx";
import {format} from "ssf";

//@ts-expect-error
import {backgroundColor} from "./DiffCell.jsx";

type CellDataExtra = {
  values: null | cellValue[];
  params: FormType,
  active: boolean,
  listeners: Set<() => void>
};
type CellData = Readonly<CellTemplate> & CellDataExtra;
type TableData = Record<string, CellData>;

const Cell = ({address, tableData, version}: {address: string, tableData: React.RefObject<TableData>, version: number}): JSX.Element | undefined=> {
  //console.log('Rendering', address);
  const [, setTick] = useState(0);
  useEffect(() => {
    const cell = tableData.current[address];
    if (!cell) return;
    const listener = () => setTick(t => t + 1);
    cell.listeners.add(listener);
    //if (cell.listeners.size > 5) console.log('critical', address)
    return () => {
      cell.listeners.delete(listener);
    }
  }, [tableData, address, version]);

  const cell = tableData.current[address];
  if (!cell) return;
  let classes = cell.classList;
  if (cell.active)
    classes = (classes ?? '') + ' active';
  return (
    <td
      data-c={cell.c}
      data-r={cell.r}
      className={classes}
      style={cell.tdStyle}
      rowSpan={cell.rowSpan}
      colSpan={cell.colSpan}
    >
      <div className={'cell-container'} style={cell.containerStyle}>{cellEvaluator(cell)}</div>
      <div className={"tag-container"}>{cell.comment}</div>
    </td>
  );
};
const cellEvaluator = (cell: CellData): JSX.Element | undefined => {
  //NOTE: React key define error here
  const mode = cell.params.mode ?? 'v';
  const numFmt = cell.numFmt;
  const f =
    cell.params.formatNumber && numFmt
      ? (x: any) => format(numFmt, x)
      : (x: any) => x;
  const {values} = cell;
  let contentStyle = cell.contentStyle;
  if (cell.params.stretchCell)
    contentStyle = {...contentStyle, maxWidth: undefined};
  if (values && values.length > 1 && mode) {
    const vals = values.map(v => v[mode]);
    if (vals.some(v => v !== vals[0])) {
      return (
        <>
          {vals.map((v, idx) =>
            <>
              {idx > 0 && <span className={"mx-1"}>↣</span>}
              <div
                className={'cell-content'}
                style={{...contentStyle, backgroundColor: backgroundColor(idx)}}
              >{f(v)}</div>
            </>
          )}
        </>
      )
    } else if (mode !== 'v') {
      const v = vals[0];
      const text = mode === 'f' ? (v ? '=' + v : '') : v;
      return (
        //@ts-expect-error
        <div className={'cell-content'} style={contentStyle}>{text}</div>
      )
    }
  }
  return (
    <div className={'cell-content'} style={contentStyle}>{cell.htmlContent}</div>
  )
};

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
      for (const cell of row)
        next[cell.address] = {
          ...cell,
          values : null,
          params : {},
          active : false,
          listeners: new Set(),
        };

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
    changeCell
  };
}
