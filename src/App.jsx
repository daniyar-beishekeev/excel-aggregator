import {useMemo, useRef, useState} from "react";
import "./App.css"
import ManageFiles from "./ManageFiles.jsx";
import LoadingOverlay from "./LoadingOverlay.jsx";
import {workbookHolder} from "./workbookHolder.jsx";
import {CellTag} from "./CellTag.jsx";

function App() {
  /** @type {import('exceljs').Workbook[]} */
  const [wbs, setWbs] = useState([]);
  const [wsList, setWsList] = useState([]);
  const [curWs, setCurWs] = useState(null);
  const [loading, setLoading] = useState(false);

  const applyFiles = async (files) => {
    setLoading(true);
    setCurWs(null);
    if (files.length === 0) {
      setWsList([]);
      setWbs([]);
      return;
    }

    const newWbs = await Promise.all(files.map(workbookHolder.create));
    setWbs(newWbs);
    const wbHandler = newWbs[0];
    setWsList(wbHandler.wb.worksheets.map(ws => [wbHandler.id, ws.name, ws.id]));
    setLoading(false);
  }
  const containerRef = useRef(null);
  const table = useMemo(() => {
    if(!wbs.length) return null;
    const ws = wbs[0].wb.getWorksheet(curWs[1]);
    const wss = wbs.slice(1).map(wbHolder => wbHolder.wb.getWorksheet(ws.name));
    const {totalRow, totalCol} = wbs[0].worksheetSize(ws);
    const zoom = 1 ?? (ws.pageSetup.scale ?? 100) / 100;
    console.log('LAST WS', ws);
    const tableRows = [];

    for (let rowNum = 1; rowNum <= totalRow; rowNum++) {
      const row = ws.getRow(rowNum);
      const cells = [];
      for (let colNum = 1; colNum <= totalCol; colNum++) {
        const cell = row.getCell(colNum)
        if(cell.master !== cell) continue;
        const parameters = {};
        const cellSize = wbs[0].cellSize(cell);
        const {h, w} = cellSize;
        if (cellSize.rowSpan > 1) parameters.rowSpan = cellSize.rowSpan;
        if (cellSize.colSpan > 1) parameters.colSpan = cellSize.colSpan;
        const style = {};
        const style2 = {};
        wbs[0].parseStyle(style, style2, cell);
        const getValue = wbs[0].getValue.bind(wbs[0]);
        const value = getValue(cell);

        let diffValue = null;
        if (wss.length > 0){
          const curWs = wss[0];
          const cell2 = curWs.getCell(cell.address);
          if (cell.html !== cell2.html) {
            diffValue = getValue(cell2);
          }
        }

        let comments = wbs[0].renderComment(cell);
        cells.push(
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
                    <span style={{ margin: "0 6px" }}>→</span>
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
      tableRows.push(<tr className={"selection"} key={row.number}>
        <td className={"colHead"}>{rowNum}</td>
        {cells}
      </tr>);
    }

    return (
      <table className={"excel"} key={curWs} style={{
        fontSize: `${14 * zoom}px`
      }}>
        <thead>
        <tr>
          <th>[]</th>
          {Array.from({length: totalCol}).map((_, col) =>
            <th>{ws.getColumn(col + 1).letter}</th>
          )}
        </tr>
        </thead>
        <tbody>{tableRows}</tbody>
      </table>
    );
  }, [curWs])

  return (
    <>
      <LoadingOverlay visible={loading} />
      <div className={'no-print'} style={{display: "flex"}}>
        {wsList.map(ws => (
          <button key={ws} onClick={() => setCurWs([ws[0], ws[2]])}>{ws[1]}</button>
        ))}
        <div style={{marginLeft: 'auto'}}>
          {wbs.length > 0 && (
            <b>{wbs[0].fileName}</b>
          )}
          <ManageFiles applyChanges={applyFiles}/>
        </div>
      </div>
      <div style={{ height: '80vh', overflow: "auto" }} ref={containerRef}>
        {table}
      </div>
    </>
  );
}

export default App;
