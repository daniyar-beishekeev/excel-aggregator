import {BasicCell} from "./BasicCell.jsx";
import {CellTag} from "./CellTag.jsx";
import {format} from 'ssf';

const bgColors =  [
  "lightgreen",
  "palevioletred",
  "#f7b32b",
  "#9b59b6",
  "#3498db",
  "#e67e22",
  "#1abc9c",
  "#e84393",
  "#ebf83b",
]
export const backgroundColor = (idx = 0) => {
  return bgColors[idx % bgColors.length];
}

const isNumberOrNull = (x) => {
  return x === null || typeof x === 'number';
}

const GroupDelimiter = ({children}) => <span className={"mx-1"}>{children}</span>

const getFormulaResolver = (formula) => {
  const round = (num) => Number(num.toFixed(3));
  const resolvers = {
    sum: (arr) =>
      arr.reduce((acc, val) => acc + (val ?? 0), 0),

    sub: (arr) => {
      const nums = arr.filter((v) => v != null);
      if (nums.length === 0) return 0;
      return nums.slice(1).reduce((acc, val) => acc - val, nums[0]);
    },

    avg: (arr) => {
      const nums = arr.filter((v) => v != null);
      if (nums.length === 0) return 0;
      const sum = nums.reduce((acc, val) => acc + val, 0);
      return round(sum / nums.length);
    },

    min: (arr) => {
      const nums = arr.filter((v) => v != null);
      return nums.length ? Math.min(...nums) : 0;
    },

    max: (arr) => {
      const nums = arr.filter((v) => v != null);
      return nums.length ? Math.max(...nums) : 0;
    },
  };

  return resolvers[formula] || (() => 'No resolver');
}

const frequencyList = (arr) => {
  const map = new Map();

  for (const item of arr){
    const key = String(item);
    map.set(key, (map.get(key) || 0) + 1);
  }

  return Array.from(map);
}

export function DiffCell({cell, wbHolder, wss, cellParams, props}) {
  cellParams = new Map(Object.entries(cellParams));
  const tags = [];
  const customProps = {};
  const valueMode = cellParams.get('valueMode');
  const nullHandling = cellParams.get('nullHandling');
  const customNullValue = cellParams.get('customNullValue');
  const getValue = (cell) => {
    let res = null;
    if (valueMode === 'fstyle') {
      res = wbHolder.getHTMLValue(cell);
    }else if (valueMode === 'formula' && cell.formula) res = cell.formula;
    else {
      res = wbHolder.getRawValue(cell);
      if (valueMode === 'formatted' && typeof res === 'number' && cell.numFmt) res = format(cell.numFmt, res);
      else if (valueMode === 'type') res = typeof res;
    }

    if (res == null) {
      if (nullHandling === 'zero') res = 0;
      else if (nullHandling === 'custom') res = customNullValue;
    }
    return res;
  };
  const getRawValue = wbHolder.getRawValue.bind(wbHolder);
  const cellSize = wbHolder.cellSize(cell);
  let value = getValue(cell);

  if (wss.some(curWs => {
    const otherSize = wbHolder.cellSize(curWs.getCell(cell.address));
    return cellSize.rowSpan !== otherSize.rowSpan || cellSize.colSpan !== otherSize.colSpan;
  })) {
    tags.push(<CellTag color={"black"}>
      Different cell size detected
    </CellTag>)
  }

  const numberAggregation = cellParams.get('numberAggregation');
  const rawVals = wss.map(curWs => curWs.getCell(cell.address)).concat(cell).map(getRawValue);
  let aggregationEngine = null;
  if (numberAggregation !== 'none') {
    if (rawVals.every(isNumberOrNull)) {
      value = getFormulaResolver(numberAggregation)(rawVals);
      aggregationEngine = `Number-${numberAggregation}`;
    }
  }
  const aggregationMode = cellParams.get('aggregationMode');
  if (!aggregationEngine && aggregationMode !== 'none') {
    if (aggregationMode === 'diff' && rawVals.some(v => v !== rawVals[0])) {
      aggregationEngine = 'diff';
      customProps.widthCoef = wss.length + 1;
      if (cellParams.get('markDifferences'))
        tags.push(<CellTag color={"purple"}>
          Differences found
        </CellTag>)
      value = <>
        <div style={{background: backgroundColor()}}>
          {value}
        </div>
        {wss.map((curWs, idx) => {
          return (
            <>
              <GroupDelimiter>↣</GroupDelimiter>
              <div style={{background: backgroundColor(idx + 1)}}>
                {getValue(curWs.getCell(cell.address)) ?? ' '}
              </div>
            </>
          )
        })}
      </>
    } else if (aggregationMode === 'frequency') {
      const freqList = frequencyList(rawVals);
      if (freqList.length !== 1) {
        aggregationEngine = 'frequency';
        customProps.widthCoef = freqList.length + 1;
        value = <>
          {"{"}
          {freqList.map((v, idx) => (
            <>
              {idx !== 0 && <GroupDelimiter>,</GroupDelimiter>}
              <div style={{ background: backgroundColor(idx)}}>{v[0] ?? ''} → {v[1]}</div>
            </>
          ))}
          {"}"}
        </>
      }
    } else if (aggregationMode === 'distinctCount') {
      const tmp = new Set(rawVals).size;
      if (tmp !== 1) {
        aggregationEngine = 'distinctCount';
        value = <div style={{background: backgroundColor(tmp)}}>
          *{tmp}
        </div>
      }
    } else if (aggregationMode === 'distinct') {
      const st = [...new Set(rawVals)];
      if (st.length !== 1) {
        aggregationEngine = 'distinct';
        customProps.widthCoef = st.length;
        value = <>
          {"{"}
          {st.map((v, idx) => (
            <>
              {idx !== 0 && <GroupDelimiter>,</GroupDelimiter>}
              <div style={{ background: backgroundColor(idx) }}>{v}</div>
            </>
          ))}
          {"}"}
        </>
      }
    }
  }
  if (aggregationEngine)
    tags.push(<CellTag color={"blue"}>Aggregated cell ({aggregationEngine})</CellTag>)

  if (cellParams.get('markFormulaErrors')) {
    const formulaErr = cell.result?.error;
    if (formulaErr) tags.push(<CellTag color={"orange"}>{formulaErr}</CellTag>)
  }

  if (cellParams.get('highlightMissing')) {
    if (rawVals.some(_ => _ == null)) tags.push(<CellTag color={"cyan"}>Missing value exist</CellTag>)
  }

  if (cellParams.get('showFormulaInTag')) {
    const formula = cell.formula;
    if (formula) tags.push(<CellTag color={"yellow"}>={formula}</CellTag>)
  }

  if (cellParams.get('showComments')) {
    const comment = wbHolder.renderComment(cell);
    if (comment) tags.push(comment)
  }
  return <BasicCell cell={cell} wbHolder={wbHolder} props={{...props, ...customProps}} tags={tags}>
    {value}
  </BasicCell>
}
