import {BasicCell} from "./BasicCell.jsx";
import {CellTag} from "./CellTag.jsx";

const bgColors =  [
  "#ff6b6b",
  "#f7b32b",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#e84393"
]
const backgroundColor = (idx) => {
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
  let value = getValue(cell);

  if (wss.some(curWs => curWs.getCell(cell.address).html !== cell.html)){
    tags.push(<CellTag color={"purple"}/>)
    const sumAggregate = isNumberOrNull(getRawValue(cell)) && wss.every(curWs => isNumberOrNull(getRawValue(curWs.getCell(cell.address))));
    if (sumAggregate) {
      tags.push(<CellTag color={"blue"}/>)
      value = wss.reduce((acc, curWs) => acc + (getRawValue(curWs.getCell(cell.address)) ?? 0), getRawValue(cell) ?? 0);
    } else {
      customProps.widthCoef = wss.length;
      value = <>
        <div style={{background: 'lightgreen'}}>
          {value}
        </div>
        {wss.map((curWs, idx) => {
          return (
            <>
              <span style={{margin: "0 6px"}}>→</span>
              <div style={{background: backgroundColor(idx)}}>
                {getValue(curWs.getCell(cell.address))}
              </div>
            </>
          )
        })}
      </>
    }
  }

  let comment = wbHolder.renderComment(cell);
  return <BasicCell cell={cell} wbHolder={wbHolder} props={{...props, ...customProps}} tags={[comment, ...tags]}>
    {value}
  </BasicCell>
}
