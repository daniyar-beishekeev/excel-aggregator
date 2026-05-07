import React, {useEffect, useRef, useState} from "react";
import {useGlobal} from "./global/GlobalContext.tsx";
import {Dropdown, Stack} from "react-bootstrap";
import i18n, {langList} from './global/i18n.ts';

import "./App.css"
import {MemoryUsage} from "./utils/MemoryUsage.tsx";

import {ManageFiles} from "./ManageFiles/ManageFiles.tsx";
import {PrivacyPolicy} from "./global/PrivacyPolicy.tsx";
import {SelectSheets} from "./SelectSheets/SelectSheets.tsx";

import {renderItem} from "./SelectSheets/SelectSheets.tsx";
import {createWorkbookHolder} from "./sheetStyle/workbookHolder.tsx";
import {backgroundColor} from "./DiffCell.jsx";
import {SelectableTool} from "./SelectableTool.tsx";
import * as XLSX from "xlsx";
import {extractVals} from "./sheetData/parser.ts";

const Cell = ({address, tableData}) => {
  const cell = tableData.current[address];
  const [, setTick] = useState(0);
  useEffect(() => {
    if (tableData.current[address])
      tableData.current[address].listener = () => setTick(t => t + 1);
    return () => {
      if (tableData.current[address])
        // eslint-disable-next-line react-hooks/exhaustive-deps
        tableData.current[address].listener = () => {};
    };
  }, [tableData, address]);
  let classes = cell.classList;
  if (cell.active)
    classes = (classes ?? '') + ' active';

  return (
    <td
      data-c={cell.c}
      data-r={cell.r}
      className={classes}
      style={cell.tdStyle}
      rowSpan={cell.rowSpan}
      colSpan={cell.colSpan}
    >
      <div className={'cell-container'} style={cell.containerStyle}>{cellEvaluator(cell)}</div>
      <div className={"tag-container"}>{cell.comment}</div>
    </td>
  );
};

const cellEvaluator = (cell) => {
  //NOTE: React key define error here
  if (!cell) return cell;
  const {values} = cell;
  if (values) {
    const vals = values;
    if (vals.some(v => v !== vals[0]))
      return (
        <>
          {vals.map((v, idx) =>
            <>
              {idx > 0 && <span className={"mx-1"}>↣</span>}
              <div
                className={'cell-content'}
                style={{...cell.contentStyle, backgroundColor: backgroundColor(idx)}}
              >{v.t}</div>
            </>
          )}
        </>
      )
  }
  return (
    <div className={'cell-content'} style={cell.contentStyle}>{cell.htmlContent}</div>
  )
};

function App() {
  const {lang, setLang} = useGlobal();
  useEffect(() => {
    i18n.changeLanguage(lang).catch(console.error);
  }, [lang]);
  const [files, setFiles] = useState([]);
  const applyFiles = (files) => {
    setFiles(files);
  }
  const [selectedSheets, setSelectedSheets] = useState([]);
  const applyVersion = useRef(0);
  const applySheets = async (sheets) => {
    const version = ++applyVersion.current;
    if (sheets.length === 0) {
      tableData.current = {};
      setTableSchema({ grid: [], id: null, totalCol: 0, totalRow: 0 });
      setTableVersion(v => v + 1);
      setSelectedSheets([]);
      return;
    }
    let newSchema = null;
    const sheet = sheets[0];
    const id = sheet.groupId + '!' + sheet.name;

    if (id !== tableSchema.id) {
      const file = files.find(file => file.id === sheet.groupId);
      if (file) {
        const wbHolder = await createWorkbookHolder(file);
        if (version !== applyVersion.current) return;//FIXME
        const grid = wbHolder.getGridTemplate(sheet.name);
        const {totalRow, totalCol} = wbHolder.worksheetSize(sheet.name);
        const nextTableData = {};
        for (const row of grid)
          for (const cell of row)
            nextTableData[cell.address] = { ...cell };
        tableData.current = nextTableData;
        newSchema = {
          grid: grid.map(r => r.map(c => ({address: c.address}))), id, totalCol, totalRow
        };
      }
    }
    const emptyWs = Object.freeze({});
    const wss2 = await Promise.all(sheets.map(async sheet => {
      const file = files.find(file => file.id === sheet.groupId);
      if (!file) return emptyWs;
      const buffer = await file.file.arrayBuffer();
      if (version !== applyVersion.current) return emptyWs;
      const wb = XLSX.read(buffer, {
        type: 'array',
        cellFormula: true,
        cellHTML: false,
        cellNF: false,
        cellStyles: false,
        cellDates: false,
        dense: false,
        sheets: sheet.name,
        cellText: false,
        bookDeps: false,
        bookFiles: false,
        bookProps: false,
        bookSheets: false,
      });
      if (!wb) return emptyWs;
      const ws = wb.Sheets[sheet.name];
      if (!ws) return emptyWs;
      return ws;
    }));
    if (version !== applyVersion.current) return;

    const {grid} = newSchema ?? tableSchema;
    for (const row of grid)
      for (const cell of row)
        tableData.current.values = extractVals(wss2, cell.address);

    if (newSchema !== null)
      setTableSchema(newSchema);
    setTableVersion(v => v + 1);
    setSelectedSheets(sheets);
  }

  const tableData = useRef({});
  const [tableVersion, setTableVersion] = useState(0);
  const [tableSchema, setTableSchema] = useState({
    grid: [],
    id: null,
    totalCol: 0,
    totalRow: 0
  });

  const setActiveCells = (c1, r1, c2, r2) => {
    if (c1 > c2) [c1, c2] = [c2, c1];
    if (r1 > r2) [r1, r2] = [r2, r1];
    if (r1 === -1) {
      r1 = 1;
      r2 = tableSchema.totalRow;
    }
    if (c1 === -1) {
      c1 = 1;
      c2 = tableSchema.totalCol;
    }
    document.querySelectorAll('.active').forEach(el => {
      const r = el.getAttribute('data-r') ?? '0';
      const c = Number(el.getAttribute('data-c') ?? '0');
      const address = XLSX.utils.encode_col(c - 1) + r;
      tableData.current[address].active = false;
      tableData.current[address]?.listener?.();
    });
    for(let r = r1; r <= r2; r++)
      for(let c = c1; c <= c2; c++) {
        const address = XLSX.utils.encode_col(c - 1) + String(r);
        tableData.current[address].active = true;
        tableData.current[address].values = null;
        tableData.current[address]?.listener?.();
        //if (td) {
        //  td.classList.add('active');
        //}
      }
  }

  return (
    <div className="d-flex flex-column vh-100">
      <PrivacyPolicy/>
      <header className="py-2 px-1 position-fixed top-0 start-0 w-100" style={{ zIndex: 12}}>
        <Stack gap={1}>
          <div style={{display: "flex", justifyContent: "space-between"}}>
            <Stack direction={"horizontal"} gap={1}>
              <SelectSheets files={files} applySheets={applySheets}/>
            </Stack>
            <Stack direction="horizontal" gap={2}>
              {import.meta.env.DEV && <MemoryUsage/>}
              <Dropdown>
                <Dropdown.Toggle variant="info" id="dropdown-basic" size={"sm"}>
                  <i className="bi bi-translate"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {Object.entries(langList).map(([key, value]) => (
                    <Dropdown.Item key={key} onClick={() => setLang(key)}>{value}</Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
              <ManageFiles applyChanges={applyFiles}/>
            </Stack>
          </div>
          <Stack direction={"horizontal"} gap={3} className={"px-3"} style={{overflowX: 'auto', backgroundColor: '#eee'}}>
            {selectedSheets.map(renderItem)}
          </Stack>
        </Stack>
      </header>
      <main
        className="flex-grow-1 overflow-auto"
        style={{ marginTop: "95px" }}
      >
        <SelectableTool handler={{setActiveCells}}>
          <table className={"excel"}>
            <tbody>
            {tableSchema.grid.map((row, rowIdx) =>
              <tr key={rowIdx}>{row.map(cell =>
                <Cell key={cell.address} address={cell.address} version={tableVersion} tableData={tableData}/>
              )}</tr>
            )}
            </tbody>
          </table>
        </SelectableTool>
      </main>
    </div>
  );
}

export default App;
