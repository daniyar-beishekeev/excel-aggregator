import React, {useEffect, useMemo, useState} from "react";
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
import {debounce} from "lodash";

function App() {
  const {setLang, contextMenuContent, openContextMenu} = useGlobal();
  const [files, setFiles] = useState([]);
  const [activeRange, setActiveRange] = useState(null);
  const [form, setForm] = useState({});
  const [filters, setFilters] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);

  const {
    tableElement,
    schema,
    changeSchema,
    changeCell,
    refreshAll,
    getCell,
    applyFilters
  } = Table();

  const applyFiles = (files) => {
    setFiles(files);
  }
  const applySheets = async (sheets) => {
    setActiveRange(null);
    setFilters([]);
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
    setFilterMap(files.map(() => true));
    refreshAll();
  }

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
    setActiveRange({r1, r2, c1, c2});
    setForm(Object.fromEntries(commonParams));
  }

  useEffect(() => {
    if (activeRange && form.userInput) {
      const {c1, c2, r1, r2} = activeRange;
      const params = Object.freeze({...form});
      for(let r = r1; r <= r2; r++)
        for(let c = c1; c <= c2; c++) {
          changeCell(`${c},${r}`, {params});
        }
    }
  }, [form, changeCell]);

  const [filterMap, setFilterMap] = useState([]);
  const debouncedApplyFilters = useMemo(() =>
      debounce((filters) => {
        setFilterMap(applyFilters(filters, selectedSheets.length));
      }, 300)
  ,[applyFilters, selectedSheets]);


  useEffect(() => {
    debouncedApplyFilters(filters);
    return () => {
      debouncedApplyFilters.cancel();
    };
  }, [filters, debouncedApplyFilters]);

  const activeRangeText = useMemo(() => {
    if (!activeRange) return null;
    const {r1, r2, c1, c2} = activeRange;
    const a = `${utils.encode_col(c1 - 1)}${r1}`;
    const b = `:${utils.encode_col(c2 - 1)}${r2}`;
    return a + (r1 === r2 && c1 === c2 ? '' : b);
  }, [activeRange]);

  return (
    <>
      {contextMenuContent}
      <PrivacyPolicy/>
      <VerticalSplitter root={true} distribution={[10, 90]}>
        <Stack gap={1}>
          <div className="p-1" style={{display: "flex", justifyContent: "space-between"}}>
            <Stack direction={"horizontal"} gap={1}>
              <SelectSheets files={files} applySheets={applySheets}/>
              <b>{activeRangeText}</b>
            </Stack>
            <Stack direction="horizontal" gap={2}>
              <MemoryUsage/>
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
            {selectedSheets.filter((v, idx) => filterMap[idx]).map(renderItem)}
          </Stack>
        </Stack>
        <HorizontalSplitter distribution={[80, 20]}>
          <SelectableTool handler={{setActiveCells}}>
            {tableElement}
          </SelectableTool>
          <CellParams applyFilters={setFilters} activeRangeText={activeRangeText} sheetNum={selectedSheets.length} form={form} setForm={setForm}/>
        </HorizontalSplitter>
      </VerticalSplitter>
    </>
  );
}

export default App;
