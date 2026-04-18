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

export function DiffCell({cell, wbHolder, wss, props}) {
  const tags = [];
  const customProps = {};
  const getValue = wbHolder.getHTMLValue.bind(wbHolder);
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

  if (wss.some(curWs => curWs.getCell(cell.address).html !== cell.html)) {
    tags.push(<CellTag color={"purple"}>
      Differences found
    </CellTag>)
    const sumAggregate = isNumberOrNull(getRawValue(cell)) && wss.every(curWs => isNumberOrNull(getRawValue(curWs.getCell(cell.address))));
    if (sumAggregate) {
      tags.push(<CellTag color={"blue"}>
        Aggregated cell(sum)
      </CellTag>)
      value = wss.reduce((acc, curWs) => acc + (getRawValue(curWs.getCell(cell.address)) ?? 0), getRawValue(cell) ?? 0);
    } else {
      customProps.widthCoef = wss.length + 1;
      value = <>
        <div style={{background: backgroundColor()}}>
          {value}
        </div>
        {wss.map((curWs, idx) => {
          return (
            <>
              <span style={{margin: "0 6px"}}>→</span>
              <div style={{background: backgroundColor(idx + 1)}}>
                {getValue(curWs.getCell(cell.address)) ?? ' '}
              </div>
            </>
          )
        })}
      </>
    }
  }

  const comment = wbHolder.renderComment(cell);
  if (comment) tags.push(comment)

  if (cell.numFmt && typeof value === 'number') value = format(cell.numFmt, value);
  return <BasicCell cell={cell} wbHolder={wbHolder} props={{...props, ...customProps}} tags={tags}>
    {value}
  </BasicCell>
}
