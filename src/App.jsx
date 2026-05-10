import React, {useEffect, useRef, useState} from "react";
import {useGlobal} from "./global/GlobalContext.tsx";
import {Button, Stack} from "react-bootstrap";
import {langList} from './global/i18n.ts';

import "./App.css"
import {MemoryUsage} from "./utils/MemoryUsage.tsx";

import {ManageFiles} from "./ManageFiles/ManageFiles.tsx";
import {PrivacyPolicy} from "./global/PrivacyPolicy.tsx";
import {SelectSheets} from "./SelectSheets/SelectSheets.tsx";

import {renderItem} from "./SelectSheets/SelectSheets.tsx";
import {createWorkbookHolder} from "./sheetStyle/workbookHolder.tsx";
import {SelectableTool} from "./SelectableTool.tsx";
import {HorizontalSplitter, VerticalSplitter} from "./layout/ScreenDivider.tsx";
import {CellParams} from "./CellParams.tsx";

import {extractVals, parseWorksheet} from "./sheetData/parseWorksheet.ts";
import {Table} from "./Table.tsx";
import {utils} from "xlsx";

function App() {
  const {setLang, contextMenuContent, openContextMenu} = useGlobal();
  const [files, setFiles] = useState([]);
  const activeRange = useRef(null);
  const [rangeText, setRangeText] = useState(null);
  const [form, setForm] = useState({});
  const [selectedSheets, setSelectedSheets] = useState([]);

  const {
    tableElement,
    schema,
    changeSchema,
    changeCell,
    refreshAll,
    getCell
  } = Table();

  const applyFiles = (files) => {
    setFiles(files);
  }
  const applySheets = async (sheets) => {
    activeRange.current = null;
    setSelectedSheets(sheets);
    if (sheets.length === 0) {
      changeSchema([], null, 0, 0);
      return;
    }
    const sheet = sheets[0];
    const id = sheet.groupId + '!' + sheet.name;
    let grid = schema.grid;

    if (id !== schema.id) {
      const file = files.find(file => file.id === sheet.groupId);
      if (file) {
        const wbHolder = await createWorkbookHolder(file);
        grid = wbHolder.getGridTemplate(sheet.name);
        const {totalRow, totalCol} = wbHolder.worksheetSize(sheet.name);
        changeSchema(grid, id, totalCol, totalRow);
      }
    }
    const wss = await Promise.all(sheets.map(sheet => parseWorksheet(files.find(file => file.id === sheet.groupId), sheet.name)));
    for (const row of grid)
      for (const cell of row) {
        changeCell(cell.address, {
          values: extractVals(wss, cell.address),
          params: {},
        }, false);
      }
    refreshAll();
  }

  if (import.meta.env.DEV)
    window.getCell = getCell;

  const setActiveCells = (c1, r1, c2, r2) => {
    if (c1 > c2) [c1, c2] = [c2, c1];
    if (r1 > r2) [r1, r2] = [r2, r1];
    if (r1 === -1) {
      r1 = 1;
      r2 = schema.totalRow;
    }
    if (c1 === -1) {
      c1 = 1;
      c2 = schema.totalCol;
    }
    document.querySelectorAll('.active').forEach(el => {
      const r = el.getAttribute('data-r') ?? '0';
      const c = Number(el.getAttribute('data-c') ?? '0');
      changeCell(`${c},${r}`, {
        active: null
      })
    });
    const commonParams = new Map(
      Object.entries(
        getCell(`${c1},${r1}`)?.params ?? {}
      )
    );
    commonParams.delete("userInput");
    for(let r = r1; r <= r2; r++) {
      const prefix = 'active'
        + (r === r1 ? ' bt' : '')
        + (r === r2 ? ' bb' : '')
      for (let c = c1; c <= c2; c++) {
        const address = `${c},${r}`;
        const cell = getCell(address);
        if (!cell) continue;
        changeCell(address, {
          active: prefix
            + (c === c1 ? ' bl' : '')
            + (c === c2 ? ' br' : '')
        })
        const params = cell.params;
        for (const [key, value] of commonParams)
          if (params[key] !== value)
            commonParams.delete(key);
      }
    }
    activeRange.current = {r1, r2, c1, c2};
    const a = `${utils.encode_col(c1 - 1)}${r1}`;
    const b = `:${utils.encode_col(c2 - 1)}${r2}`;
    setRangeText(a + (r1 === r2 && c1 === c2 ? '' : b))
    setForm(Object.fromEntries(commonParams));
  }

  useEffect(() => {
    if (activeRange.current && form.userInput) {
      const {c1, c2, r1, r2} = activeRange.current;
      const params = Object.freeze({...form});
      for(let r = r1; r <= r2; r++)
        for(let c = c1; c <= c2; c++) {
          changeCell(`${c},${r}`, {params});
        }
    }
  }, [form, changeCell])

  return (
    <>
      {contextMenuContent}
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
              <Button variant="info" size="sm" onClick={
                e => openContextMenu(e,
                  Object.entries(langList).map(([key, value]) => (
                    { id: key, label: value }
                  )), item => setLang(item.id))}
              ><i className="bi bi-translate"/></Button>
              <ManageFiles applyChanges={applyFiles}/>
            </Stack>
          </div>
          <Stack direction={"horizontal"} gap={3} className={"px-3"} style={{overflowX: 'auto', backgroundColor: '#eee'}}>
            {selectedSheets.map(renderItem)}
          </Stack>
        </Stack>
        <HorizontalSplitter distribution={[80, 20]}>
          <SelectableTool handler={{setActiveCells}}>
            {tableElement}
          </SelectableTool>
          <VerticalSplitter distribution={[70, 30]}>
            <CellParams activeRange={activeRange} sheetNum={selectedSheets.length} form={form} setForm={setForm}/>
            <pre>{JSON.stringify(form, null, 2)}</pre>
          </VerticalSplitter>
        </HorizontalSplitter>
      </VerticalSplitter>
    </>
  );
}

export default App;
