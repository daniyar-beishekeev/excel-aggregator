const SAFE_LIMITER = 5;

import React, {type CSSProperties, type JSX, useEffect, useState} from "react";
import {format} from "ssf";
import type {CellData, TableData, TableParams} from "./Table.tsx";

//@ts-expect-error
import {backgroundColor} from "../DiffCell.jsx";
import type {cellValue} from "./parseWorksheet.ts";
import {isSame} from "./diff.ts";
import type {FormTypeFull} from "./plugins/CellParams.tsx";

export function Cell({address, tableData, version, tableParams}: {address: string, tableData: React.RefObject<TableData>, tableParams: React.RefObject<TableParams>, version: number}): JSX.Element | undefined {
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
  return cellEvaluator(cell, tableParams);
}

function cellEvaluator(cell: CellData, tableParams: React.RefObject<TableParams>): JSX.Element | undefined {
  let classes = (cell.classList ?? '') + ' ' + cell.cssSelector;
  if (cell.active)
    classes += ' ' + cell.active;
  const customContainerStyle:CSSProperties = {};
  const customContentStyle:CSSProperties = {};
  const {w, h} = cell;
  if (h && w) {
    if (!cell.params.stretchCell) {
      customContentStyle.maxWidth = w;
    }
    if (!cell.params.compactCell) {
      customContainerStyle.minWidth = w;
      customContainerStyle.height = h;
    }
  }
  return (
    <td
      data-c={cell.c}
      data-r={cell.r}
      className={classes}
      rowSpan={cell.rowSpan}
      colSpan={cell.colSpan}
    >
      <div className={'cell-container'} style={customContainerStyle}>{cellEvaluator2(cell, customContentStyle, tableParams)}</div>
      <div className={"tag-container"}>{cell.comment}</div>
    </td>
  );
}

function parseNumber(input: string): number | null {
  const n: number = Number(input);
  return Number.isFinite(n) ? n : null;
}
const converters: Record<FormTypeFull['numberAggregatorStrict'], (cell: cellValue) => number | null> = {
  //TODO: FIX SO TYPESCRIPT AUTOMATICALLY CAPTURES v.v type
  strict: (v) => (v.t === "n" ? v.v as number : null),
  emptyOk: (v) =>
    v.t === "n"
      ? v.v as number
      : v.t === "z"
        ? 0
        : null,
  emptyBooleanOk: (v) =>
    v.t === "n"
      ? v.v as number
      : v.t === "z"
        ? 0
        : v.t === "b"
          ? v.v ? 1 : 0
          : null,
  tryParse: (v) => {
    if (v.t === "n") return v.v as number
    if (v.t === "z") return 0;
    if (v.t === "b") return v.v ? 1 : 0;
    if (v.t === "s") return parseNumber(v.v as string);
    return null;
  },
  tryHardParse: (v) => {
    if (v.t === "n") return v.v as number;
    if (v.t === "z") return 0;
    if (v.t === "b") return v.v ? 1 : 0;
    if (v.t === "s") {
      const s = (v.v as string).replace(/\s+/g, "");
      if (s === "") return null;
      return parseNumber(s);
    }
    return null;
  },
};

const round = (n: number): number => Number(n.toFixed(3));
const numberAggregatorsSingle: Pick<Record<FormTypeFull['numberAggregator'], (n: number[]) => number>, 'sum' | 'sub' | 'avg' | 'min' | 'max'> = {
  sum: (arr) => arr.reduce((acc, val) => acc + val, 0),
  sub: (arr) => arr.reduce((acc, val) => acc + val, -2 * arr[0]!),
  avg: (arr) => round(arr.reduce((acc, val) => acc + val, 0) / arr.length),
  min: (arr) => Math.min(...arr),
  max: (arr) => Math.max(...arr),
};

const numberAggregatorsMulti: Pick<Record<FormTypeFull['numberAggregator'], (n: number[]) => number[]>, 'range'> = {
  range: (n: number[]): [number, number] => [numberAggregatorsSingle['min'](n), numberAggregatorsSingle['max'](n)]
};

type formatter = (x: any) => any;
function cellEvaluator2(cell: CellData, customContentStyle: Readonly<CSSProperties>, tableParams: React.RefObject<TableParams>): JSX.Element | undefined {
  //NOTE: React key define error here
  const mode = cell.params.mode ?? 'v';
  const {numFmt, values: unfilteredValues} = cell;
  const f =
    cell.params.formatNumber && numFmt
      ? (x: any) => format(numFmt, x)
      : (x: any) => x;
  const limit = cell.params.showLimit || SAFE_LIMITER;

  let values = unfilteredValues;
  const {filterMap} = tableParams.current;
  const filterAvailable = !!(unfilteredValues && filterMap && unfilteredValues.length === filterMap.length);
  if (filterAvailable)
    values = unfilteredValues.filter((v, idx) => filterMap[idx]);
  if (values && values.length > 0) {
    //@ts-expect-error
    const vals: m2cv =
      mode === 'v' ? values :
      mode === 't' ? values.map(v => ({t: 's', v: v.t}))
      : values.map(v => ({t: 's', v: (v.f ? '=' + v.f : '')}));
    const numberAggregator = cell.params.numberAggregator ?? 'none';
    if (numberAggregator !== 'none') {
      const converter = converters[cell.params.numberAggregatorStrict ?? 'emptyOk'];
      if (converter) {
        const nums = vals.map(converter);
        if (nums.every(n => n != null)) {
          //@ts-expect-error
          const agg: ((n: number[]) => number) | undefined = numberAggregatorsSingle[numberAggregator];
          if (agg) {
            return (
              <div className={'cell-content'} style={customContentStyle}>{f(agg(nums))}</div>
            )
          } else {
            //@ts-expect-error
            const agg2: ((n: number[]) => number[]) | undefined = numberAggregatorsMulti[numberAggregator];
            if (agg2) {
              const res = agg2(nums);
              const l = groupDelimiter('[');
              const r = groupDelimiter(']');
              return <>
                {l}
                {res.map((v, idx) =>
                  <>
                    {idx > 0 && groupDelimiter(', ')}
                    <div className={'cell-content'} style={customContentStyle}>{f(v)}</div>
                  </>
                )}
                {r}
              </>
            } else {
              if (numberAggregator === 'diffVar' || numberAggregator === 'diffVarPercent') {
                const middle = (idx: number) => {
                  if (idx === 0) return null;
                  const a = nums[idx - 1]!;
                  const b = nums[idx]!;
                  const diff = b - a;
                  let diff2: number | string = diff;
                  if (numberAggregator === 'diffVarPercent')
                    diff2 = a === 0 ? '∞' : round((diff / a) * 100);
                  return (
                    <div className={'diffBetween mx-1'}>
                      <span style={{backgroundColor:
                          b > a ? "#b7e4c7" :
                          b < a ? "#f5b5b5" :
                            "#ffe69c"
                      }}>{b >= a ? "+" : ""}{diff2}{numberAggregator === 'diffVarPercent' ? '%' : ''}</span>
                    </div>
                  );
                };

                return (
                  <>
                    {nums.map((v, idx) =>
                      (idx < limit && <>
                        {middle(idx)}
                        <div
                          className={'cell-content'}
                          style={{...customContentStyle, backgroundColor: backgroundColor(idx)}}
                        >{f(v)}</div>
                      </>)
                    )}
                    {vals.length >= limit && groupDelimiter('...')}
                  </>
                )
              }
            }
          }
        }
      }
    }
    const generalAggregator = cell.params.generalAggregator ?? 'diff';
    if (!isSame(vals)) {
      switch (generalAggregator) {
        case "diff":
          return diffAggregator(cell, mode, vals, customContentStyle, f, limit);
        case "freq":
          return freqAggregator(vals, customContentStyle, f, limit);
        case "set":
          return setAggregator(vals, customContentStyle, f, limit);
      }
    }
    switch (generalAggregator) {
      case "countSet":
        return setCountAggregator(vals, customContentStyle);
    }
  }
  if (filterAvailable && values) {
    if (values.length === 0) return <div className={'cell-content'} style={customContentStyle}></div>
    const candidates = [values[0]!, unfilteredValues[0]!];
    //@ts-expect-error
    const vals: m2cv =
      mode === 'v' ? candidates :
        mode === 't' ? candidates.map(v => ({t: 's', v: v.t}))
          : candidates.map(v => ({t: 's', v: (v.f ? '=' + v.f : '')}));
    if (!isSame(vals)) return (
      <div className={'cell-content'} style={customContentStyle}>{f(vals[0].v)}</div>
    )
  }
  return (
    <div className={'cell-content'} style={customContentStyle}>{cell.htmlContent}</div>
  )
}

/**
 * Type guard for cellValue[] with length min 2
 */
type m2cv = [cellValue, cellValue, ...cellValue[]];

function groupDelimiter (delimiter: string) {return <span className={"mx-1"}>{delimiter}</span>}
function diffAggregator(cell: CellData, mode: FormTypeFull['mode'], vals: m2cv, customContentStyle: Readonly<CSSProperties>, f: formatter, limit: number): JSX.Element {
  return (
    <>
      {vals.map((v, idx) =>
        (idx < limit && <>
          {idx > 0 && groupDelimiter('↣')}
          <div
            className={'cell-content'}
            data-idx={idx}
            style={{...customContentStyle, backgroundColor: backgroundColor(idx)}}
          >{f(v.v)}</div>
        </>)
      )}
      {vals.length >= limit && groupDelimiter('...')}
    </>
  )
}

function frequencyList(arr: cellValue[]): [cellValue['v'], number][] {
  const map = new Map<cellValue['v'], number>();
  for (const item of arr) {
    const k = item.v;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map).sort((a, b) => b[1] - a[1]);
}
function valueMapper(vals: cellValue[]) {
  return new Map(
    vals.map((value, index) => [value.v, index])
  );
}
function freqAggregator(vals: m2cv, customContentStyle: Readonly<CSSProperties>, f: formatter, limit: number): JSX.Element {
  const freqList = frequencyList(vals);
  const idxMap = valueMapper(vals);
  return (
    <>
      {groupDelimiter('*')}
      {freqList.map(([v, cnt], idx) =>
        (idx < limit && <>
          {idx > 0 && groupDelimiter(', ')}
          <div
            className={'cell-content'}
            data-idx={idxMap.get(v)}
            style={{...customContentStyle, backgroundColor: backgroundColor(idx)}}
          >{f(v)}→{cnt}</div>
        </>)
      )}
      {freqList.length >= limit && groupDelimiter(', ...')}
    </>
  )
}

function setAggregator(vals: m2cv, customContentStyle: Readonly<CSSProperties>, f: formatter, limit: number): JSX.Element {
  const st = [...new Set(vals.map(v => v.v))];
  const idxMap = valueMapper(vals);
  return (
    <>
      {groupDelimiter('{')}
      {st.map((v, idx) =>
        (idx < limit && <>
          {idx > 0 && groupDelimiter(', ')}
          <div
            className={'cell-content'}
            data-idx={idxMap.get(v)}
            style={{...customContentStyle, backgroundColor: backgroundColor(idx)}}
          >{f(v)}</div>
        </>)
      )}
      {st.length >= limit && groupDelimiter(', ...')}
      {groupDelimiter('}')}
    </>
  )
}

function setCountAggregator(vals: m2cv, customContentStyle: Readonly<CSSProperties>): JSX.Element {
  const sz = new Set(vals.map(v => v.v)).size;
  return (
    <>
      {groupDelimiter('*')}
      <div
        className={'cell-content'}
        style={customContentStyle}
      >{sz}</div>
    </>
  )
}
