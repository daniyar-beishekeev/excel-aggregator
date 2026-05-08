import React, {useEffect, useMemo, useRef, useState} from "react";
import {useGlobal} from "./global/GlobalContext.tsx";
import {Dropdown, Stack} from "react-bootstrap";
import {langList} from './global/i18n.ts';

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
import {HorizontalSplitter, VerticalSplitter} from "./layout/ScreenDivider.tsx";
import {CellParams} from "./CellParams.tsx";

import {format} from 'ssf';
import {extractVals, parseWorksheet} from "./sheetData/parseWorksheet.ts";

const Cell = ({address, tableData, version}) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const cell = tableData.current[address];
    const listener = () => setTick(t => t + 1);
    cell.listeners.add(listener);
    return () => cell.listeners.delete(listener);
  }, [tableData, address, version]);

  const cell = tableData.current[address];
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
  const mode = cell.params.mode ?? 'v';
  const f = cell.params.formatNumber && cell.numFmt ? (x => format(cell.numFmt, x)) : (x => x)
  const {values} = cell;
  let contentStyle = cell.contentStyle;
  if (cell.params.stretchCell)
    contentStyle = {...contentStyle, maxWidth: null};
  if (values && mode) {
    const vals = values.map(v => v[mode]);
    if (vals.some(v => v !== vals[0])) {
      return (
        <>
          {vals.map((v, idx) =>
            <>
              {idx > 0 && <span className={"mx-1"}>↣</span>}
              <div
                className={'cell-content'}
                style={{...contentStyle, backgroundColor: backgroundColor(idx)}}
              >{f(v)}</div>
            </>
          )}
        </>
      )
    } else if (mode !== 'v') {
      const text = mode === 'f' ? (vals[0] ? '=' + vals[0] : '') : vals[0];
      return (
        <div className={'cell-content'} style={contentStyle}>{text}</div>
      )
    }
  }
  return (
    <div className={'cell-content'} style={contentStyle}>{cell.htmlContent}</div>
  )
};

function App() {
  const {setLang} = useGlobal();
  const [files, setFiles] = useState([]);
  const tableData = useRef({});
  const [tableVersion, setTableVersion] = useState(0);
  const [tableSchema, setTableSchema] = useState({
    grid: [],
    id: null,
    totalCol: 0,
    totalRow: 0
  });
  const activeRange = useRef(null);
  const [rangeText, setRangeText] = useState(null);
  const [form, setForm] = useState({});
  const [selectedSheets, setSelectedSheets] = useState([]);

  const applyFiles = (files) => {
    setFiles(files);
  }
  const applySheets = async (sheets) => {
    activeRange.current = null;
    if (sheets.length === 0) {
      tableData.current = {};
      setTableSchema({ grid: [], id: null, totalCol: 0, totalRow: 0 });
      setTableVersion(v => v + 1);
      setSelectedSheets([]);
      activeRange.current = null;
      return;
    }
    let newSchema = null;
    const sheet = sheets[0];
    const id = sheet.groupId + '!' + sheet.name;

    if (id !== tableSchema.id) {
      const file = files.find(file => file.id === sheet.groupId);
      if (file) {
        const wbHolder = await createWorkbookHolder(file);
        const grid = wbHolder.getGridTemplate(sheet.name);
        const {totalRow, totalCol} = wbHolder.worksheetSize(sheet.name);
        const nextTableData = {};
        for (const row of grid)
          for (const cell of row)
            nextTableData[cell.address] = {...cell,
              listeners: new Set()
            };
        tableData.current = nextTableData;
        newSchema = {
          grid: grid.map(r => r.map(c => ({address: c.address}))), id, totalCol, totalRow
        };
      }
    }
    const wss2 = await Promise.all(sheets.map(sheet => parseWorksheet(files.find(file => file.id === sheet.groupId), sheet.name)));

    const {grid} = newSchema ?? tableSchema;
    for (const row of grid)
      for (const cell of row) {
        tableData.current[cell.address].values = extractVals(wss2, cell.address);
        tableData.current[cell.address].params = {};
      }

    if (newSchema !== null)
      setTableSchema(newSchema);
    setTableVersion(v => v + 1);
    setSelectedSheets(sheets);
  }

  const refreshCell = useMemo(() => (address) => {
    const cell = tableData.current[address];
    cell.listeners?.forEach(listener => listener());
  }, [tableData]);

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
      const cell = tableData.current[address];
      if (!cell) return;
      cell.active = false;
      refreshCell(address);
    });
    for(let r = r1; r <= r2; r++)
      for(let c = c1; c <= c2; c++) {
        const address = XLSX.utils.encode_col(c - 1) + String(r);
        const cell = tableData.current[address];
        if (!cell) continue;
        cell.active = true;
        refreshCell(address);
      }
    activeRange.current = {r1, r2, c1, c2};
    setRangeText(`${XLSX.utils.encode_col(c1 - 1)}${r1}:${XLSX.utils.encode_col(c2 - 1)}${r2}`)
    setForm({});
  }

  useEffect(() => {
    if (activeRange.current && form.userInput) {
      const {c1, c2, r1, r2} = activeRange.current;
      const params = Object.freeze({...form});
      for(let r = r1; r <= r2; r++)
        for(let c = c1; c <= c2; c++) {
          const address = XLSX.utils.encode_col(c - 1) + String(r);
          const cell = tableData.current[address];
          if (!cell) continue;
          cell.params = params;
          refreshCell(address);
        }
    }
  }, [form, refreshCell])

  return (
    <>
      <PrivacyPolicy/>
      <VerticalSplitter root={true} distribution={[10, 90]}>
        <Stack gap={1}>
          <div style={{display: "flex", justifyContent: "space-between"}}>
            <Stack direction={"horizontal"} gap={1}>
              <SelectSheets files={files} applySheets={applySheets}/>
              <b>{rangeText}</b>
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
        <HorizontalSplitter distribution={[80, 20]}>
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
          <VerticalSplitter>
            <CellParams sheetNum={selectedSheets.length} form={form} setForm={setForm}/>
            <pre>{JSON.stringify(form, null, 2)}</pre>
          </VerticalSplitter>
        </HorizontalSplitter>
      </VerticalSplitter>
    </>
  );
}

export default App;
