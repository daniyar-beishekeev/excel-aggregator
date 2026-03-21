import {CellTag} from "./CellTag.jsx";

export function DiffCell({cell, wbHolder, wss, props}) {
  const zoom = props?.zoom ?? 1;
  const parameters = {};
  const cellSize = wbHolder.cellSize(cell);
  const {h, w} = cellSize;
  if (cellSize.rowSpan > 1) parameters.rowSpan = cellSize.rowSpan;
  if (cellSize.colSpan > 1) parameters.colSpan = cellSize.colSpan;
  const style = {};
  const style2 = {};
  wbHolder.parseStyle(style, style2, cell);
  const getValue = wbHolder.getHTMLValue.bind(wbHolder);
  const value = getValue(cell);

  let diffValue = null;
  if (wss.length > 0) {
    const curWs = wss[0];
    const cell2 = curWs.getCell(cell.address);
    if (cell.html !== cell2.html) {
      diffValue = getValue(cell2);
    }
  }

  let comments = wbHolder.renderComment(cell);
  return (
    <td key={cell.address} {...parameters} style={style}
        data-addr={cell.address}
    >
      <div className={"cell-content"} style={{
        minWidth: zoom * (diffValue ? w * 2 : w),
        width: '100%',
        height: zoom * h,
        ...style2
      }}>
        <div style={{
          position: "absolute",
          display: "inherit",
        }}>
          {diffValue ? (
            <>
              <div style={{background: 'palevioletred'}}>
                {value}
              </div>
              <span style={{margin: "0 6px"}}>→</span>
              <div style={{background: 'lightgreen'}}>
                {diffValue}
              </div>
            </>
          ) : value}
        </div>
      </div>
      <div className={"tag-container"}>
        {comments && <CellTag>{comments}</CellTag>}
        {diffValue && <CellTag color={"purple"}/>}
      </div>
    </td>
  );
}
