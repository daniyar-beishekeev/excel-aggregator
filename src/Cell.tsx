import React, {type CSSProperties, type JSX, useEffect, useState} from "react";
import {format} from "ssf";
import type {CellData, TableData} from "./Table.tsx";

//@ts-expect-error
import {backgroundColor} from "./DiffCell.jsx";

export function Cell({address, tableData, version}: {address: string, tableData: React.RefObject<TableData>, version: number}): JSX.Element | undefined {
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
  return cellEvaluator(cell);
}

function cellEvaluator(cell: CellData): JSX.Element | undefined {
  let classes = cell.classList;
  if (cell.active)
    classes = (classes ?? '') + ' active';
  const customContainerStyle:CSSProperties = {...cell.containerStyle};
  const customContentStyle:CSSProperties = {...cell.contentStyle};
  const {w, h} = cell;
  if (h && w) {
    if (!cell.params.stretchCell) {
      customContentStyle.maxWidth = w;
      customContentStyle.maxHeight = h;
    }
    if (cell.params.compactCell) {
      customContainerStyle.maxWidth = w;
      customContainerStyle.maxHeight = h;
    } else {
      customContainerStyle.minWidth = w;
      customContainerStyle.minHeight = h;
    }
  }
  return (
    <td
      data-c={cell.c}
      data-r={cell.r}
      className={classes}
      style={cell.tdStyle}
      rowSpan={cell.rowSpan}
      colSpan={cell.colSpan}
    >
      <div className={'cell-container'} style={customContainerStyle}>{cellEvaluator2(cell, customContentStyle)}</div>
      <div className={"tag-container"}>{cell.comment}</div>
    </td>
  );
}

function cellEvaluator2(cell: CellData, customContentStyle: Readonly<CSSProperties>): JSX.Element | undefined {
  //NOTE: React key define error here
  const mode = cell.params.mode ?? 'v';
  const {numFmt, values} = cell;
  const f =
    cell.params.formatNumber && numFmt
      ? (x: any) => format(numFmt, x)
      : (x: any) => x;
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
                style={{...customContentStyle, backgroundColor: backgroundColor(idx)}}
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
        <div className={'cell-content'} style={customContentStyle}>{text}</div>
      )
    }
  }
  return (
    <div className={'cell-content'} style={customContentStyle}>{cell.htmlContent}</div>
  )
}
