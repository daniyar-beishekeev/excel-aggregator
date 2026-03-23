import {useCallback, useMemo, useState} from "react";
import "./App.css"
import ManageFiles from "./ManageFiles.jsx";
import LoadingOverlay from "./LoadingOverlay.jsx";
import {workbookHolder} from "./workbookHolder.jsx";
import {BasicTable} from "./BasicTable.jsx";
import {DiffCell, backgroundColor} from "./DiffCell.jsx";

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
      setLoading(false);
      setWbs([]);
      return;
    }

    const newWbs = await Promise.all(files.map(workbookHolder.create));
    setWbs(newWbs);
    const wbHandler = newWbs[0];
    setWsList(wbHandler.wb.worksheets.map(ws => [wbHandler.id, ws.name, ws.id]));
    setLoading(false);
  }

  const ws = useMemo(() => {
    if (!wbs?.length || !curWs) return null;
    return wbs[0].wb.getWorksheet(curWs[1]);
  }, [wbs, curWs]);

  const wss = useMemo(() => {
    if (!ws) return [];
    return wbs.slice(1).map(wbHolder =>
      wbHolder.wb.getWorksheet(ws.name)
    );
  }, [wbs, ws]);

  const cellEvaluator = useCallback(
    (cell, props) => (
      <DiffCell
        cell={cell}
        wbHolder={wbs[0]}
        wss={wss}
        props={props}
      />
    ),
    [wbs, wss]
  );

  const table = useMemo(() => {
    if (!ws) return null;

    console.log('LAST WS', ws);

    return (
      <BasicTable
        key={JSON.stringify(curWs)}
        ws={ws}
        wbHolder={wbs[0]}
        cellEvaluator={cellEvaluator}
      />
    );
  }, [curWs, ws, wbs, cellEvaluator]);

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
      <LoadingOverlay visible={loading} />
      <div className={'no-print'} style={{display: "flex", justifyContent: "space-between"}}>
        <div>
          {wsList.map(ws => (
            <button key={ws} onClick={() => setCurWs([ws[0], ws[2]])}>{ws[1]}</button>
          ))}
        </div>
        <div>
          {wbs.length > 0 && (
            <b>Schema: {wbs[0].fileName}</b>
          )}
        </div>
        <div>
          <ManageFiles applyChanges={applyFiles}/>
        </div>
      </div>
      {wbs && (<div style={{display: 'flex', gap: 5, overflow: 'auto', backgroundColor: '#eee'}}>
        {wbs.map((ws, idx) => (
          <b key={ws.id} style={{backgroundColor: backgroundColor(idx)}}>
            {ws.fileName}
          </b>
        ))}
      </div>)}
      <div style={{ height: '80vh', overflow: "auto", resize: "both" }}>
        {table}
      </div>
    </div>
  );
}

export default App;
