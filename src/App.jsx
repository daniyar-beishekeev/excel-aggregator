import {useCallback, useMemo, useState} from "react";
import "./App.css"
import ManageFiles from "./ManageFiles.jsx";
import LoadingOverlay from "./LoadingOverlay.jsx";
import {workbookHolder} from "./workbookHolder.jsx";
import {BasicTable} from "./BasicTable.jsx";
import {backgroundColor, DiffCell} from "./DiffCell.jsx";
import {Dropdown, Stack} from "react-bootstrap";
import {CellEvaluatorParameters} from "./CellEvaluatorParameters.jsx";
import {WbSheetsMap} from "./WbSheetsMap.jsx";
import {PrivacyPolicy} from "./PrivacyPolicy.jsx";
import {Workbook} from "exceljs";

function App() {
  /** @type {import('exceljs').Workbook[]} */
  const [wbs, setWbs] = useState([]);
  const [wsList, setWsList] = useState([]);
  const [curWs, setCurWs] = useState(null);
  const [loading, setLoading] = useState(false);

  const applyFiles = useCallback(async (files) => {
    setLoading(true);
    setCurWs(null);
    if (files.length === 0) {
      setWsList([]);
      setLoading(false);
      setWbs([]);
      return;
    }

    const cache = Object.fromEntries(wbs.map(wb => [wb.id, wb]));
    const newWbs = await Promise.all(files.map(file => (file.id in cache) ? Promise.resolve(cache[file.id]) : workbookHolder.create(file)));
    setWbs(newWbs);
    const wbHandler = newWbs[0];
    setWsList(wbHandler.wb.worksheets.map(ws => [wbHandler.id, ws.name, ws.id]));
    setLoading(false);
  }, [wbs]);

  const ws = useMemo(() => {
    if (!wbs?.length || !curWs) return null;
    return wbs[0].wb.getWorksheet(curWs[1]);
  }, [wbs, curWs]);

  const wss = useMemo(() => {
    if (!ws) return [];
    const emptyWs = new Workbook().addWorksheet('(Empty)')
    return wbs.slice(1).map(wbHolder => {
      return wbHolder.wb.getWorksheet(ws.name) ?? emptyWs;
    }
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
    <div className="d-flex flex-column vh-100">
      <PrivacyPolicy/>
      <LoadingOverlay visible={loading} />
      <header className="py-2 px-1 position-fixed top-0 start-0 w-100">
        <Stack gap={1}>
          <div style={{display: "flex", justifyContent: "space-between"}}>
            <Stack direction={"horizontal"} gap={1}>
              <b>Sheet: </b>
              <select defaultValue={"none"} onChange={e => setCurWs(JSON.parse(e.target.value))}>
                <option value={"none"} disabled>*Select sheet</option>
                {wsList.map(ws => (
                  <option key={ws} value={JSON.stringify([ws[0], ws[2]])}>{ws[1]}</option>
                ))}
              </select>
              {wbs && wbs.length > 0 && (<WbSheetsMap wbs={wbs}/>)}
            </Stack>
            <Stack direction="horizontal" gap={2}>
              <Dropdown>
                <Dropdown.Toggle variant="info" id="dropdown-basic" size={"sm"}>
                  <i className="bi bi-translate"></i>
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  {['en', 'ru'].map(ln => <Dropdown.Item onClick={() => alert(ln)}>{ln}</Dropdown.Item>)}
                </Dropdown.Menu>
              </Dropdown>
              <CellEvaluatorParameters/>
              <ManageFiles applyChanges={applyFiles}/>
            </Stack>
          </div>
          {wbs && (<div style={{display: 'flex', gap: 5, overflow: 'auto', backgroundColor: '#eee'}}>
            {wbs.map((ws, idx) => (
              <b key={ws.id} style={{backgroundColor: backgroundColor(idx)}}>
                {ws.fileName}
              </b>
            ))}
          </div>)}
        </Stack>
      </header>
      <main className="flex-grow-1 overflow-auto" style={{ marginTop: "80px" }}>
        {table}
      </main>
    </div>
  );
}

export default App;
