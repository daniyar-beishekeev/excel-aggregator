export function BasicCell({cell, wbHolder, props, tags, children}) {
  const zoom = props?.zoom ?? 1;
  const parameters = {};
  const cellSize = wbHolder.cellSize(cell);
  const {h, w} = cellSize;
  if (cellSize.rowSpan > 1) parameters.rowSpan = cellSize.rowSpan;
  if (cellSize.colSpan > 1) parameters.colSpan = cellSize.colSpan;
  const style = {};
  const style2 = {};
  wbHolder.parseStyle(style, style2, cell);

  return (
    <td key={cell.address} {...parameters} style={style}
        data-addr={cell.address}
    >
      <div className={"cell-content"} style={{
        minWidth: (props?.widthCoef ?? 1) * zoom * w,
        width: '100%',
        height: zoom * h,
        ...style2
      }}>
        <div style={{
          position: "absolute",
          display: "inherit",
        }}>
          {children}
        </div>
      </div>
      <div className={"tag-container"}>
        {tags}
      </div>
    </td>
  );
}
