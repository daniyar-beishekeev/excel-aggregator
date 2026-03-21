import {useMemo, useRef, useState} from "react";
import "./App.css"
import ManageFiles from "./ManageFiles.jsx";
import LoadingOverlay from "./LoadingOverlay.jsx";
import {workbookHolder} from "./workbookHolder.jsx";
import {BasicTable} from "./BasicTable.jsx";
import {DiffCell} from "./DiffCell.jsx";

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
    if(!wbs?.length || !curWs) return null;
    const ws = wbs[0].wb.getWorksheet(curWs[1]);
    const wss = wbs.slice(1).map(wbHolder => wbHolder.wb.getWorksheet(ws.name));
    console.log('LAST WS', ws);

    return <BasicTable ws={ws} wbHolder={wbs[0]} cellEvaluator={(cell, props) => {
      return <DiffCell cell={cell} wbHolder={wbs[0]} wss={wss} props={props}/>;
    }}/>;
  }, [wbs, curWs])

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
      <div style={{ height: '80vh', overflow: "auto", resize: "both" }} ref={containerRef}>
        {table}
      </div>
    </>
  );
}

export default App;
