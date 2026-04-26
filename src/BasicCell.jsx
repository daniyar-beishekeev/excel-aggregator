import {diffCell} from "./DiffCell.jsx";
import {useTranslation} from "react-i18next";

export function BasicCell({cell, wbHolder, props, wss, cellParams}) {
  const zoom = /*props?.zoom ?? */1;
  const {t} = useTranslation();
  const parameters = {};
  const cellSize = wbHolder.cellSize(cell);
  let {h, w} = cellSize;
  h *= zoom; w *= zoom;
  if (cellSize.rowSpan > 1) parameters.rowSpan = cellSize.rowSpan;
  if (cellSize.colSpan > 1) parameters.colSpan = cellSize.colSpan;
  const style = {};
  const style2 = {};
  wbHolder.parseStyle(style, style2, cell);
  const {tags, children} = diffCell({h, w, t, cell, wbHolder, wss, cellParams, props, style2})
  if(cell.address === 'B2') console.log(zoom, w, h)

  return (
    <td key={cell.address} {...parameters} style={style}
        data-addr={cell.address}
    >
      <div className={'cell-container'}>{children}</div>
      <div className={"tag-container"}>
        {tags}
      </div>
    </td>
  );
}
