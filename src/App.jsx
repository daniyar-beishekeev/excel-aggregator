import {useEffect, useState} from "react";
import "./App.css"
import {ManageFiles} from "./ManageFiles/ManageFiles.tsx";
import {Dropdown, Stack} from "react-bootstrap";
import {CellEvaluatorParameters} from "./CellEvaluatorParameters.jsx";
import {PrivacyPolicy} from "./global/PrivacyPolicy.tsx";
import i18n, {langList} from './global/i18n.ts';
import {MemoryUsage} from "./utils/MemoryUsage.tsx";
import {useGlobal} from "./global/GlobalContext.tsx";
import {SelectSheets} from "./SelectSheets/SelectSheets.tsx";
import {workbookHolder} from "./sheetStyle/workbookHolder.tsx";

function App() {
  const {lang, setLang} = useGlobal();
  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);
  const [files, setFiles] = useState([]);
  const applyFiles = (files) => {
    console.log(files);
    setFiles(files);
  }
  const [selectedSheets, setSelectedSheets] = useState([]);
  const applySheets = (sheets) => {
    console.log(sheets);
    setSelectedSheets(sheets);
  }
  useEffect(() => {
    const fileIds = new Set(files.map(file => file.id));
    setSelectedSheets(old => old.filter(sheet => fileIds.has(sheet.groupId)));
  }, [files]);

  const [tableSchema, setTableSchema] = useState([]);

  useEffect(() => {
    (async () => {
      const urls = Object.keys(import.meta.glob('/public/*')).map(_ => _.slice(7))
        .map(e => import.meta.env.BASE_URL + e);

      const files = await Promise.all(
        urls.slice(0, 1500).map(async (url, index) => {
          const response = await fetch(url);
          const blob = await response.blob();

          const fileName = url.split('/').pop() || `file-${index}`;

          return new File([blob], fileName, { type: blob.type });
        })
      )
      const wbHolder = await workbookHolder.create({id: crypto.randomUUID(), file: files[0]});
      const sheet = [
        'Тит.лист',
        'Отчет 1-Е Р.1',
        'Р.2'
      ][2];
      const tmp = wbHolder.getGridTemplate(sheet);
      setTableSchema(tmp);
    })();
    return () => {};
  }, []);

  const [cellParams, setCellParams] = useState(null);

  const loremIpsum = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.'.split(' ');

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
              <CellEvaluatorParameters applyChanges={setCellParams}/>
              <ManageFiles applyChanges={applyFiles}/>
            </Stack>
          </div>
          <Stack direction={"horizontal"} gap={3} className={"px-3"} style={{overflowX: 'auto', backgroundColor: '#eee'}}>
            {loremIpsum.map((txt, idx) => (<div key={idx}>{txt}</div>))}
          </Stack>
        </Stack>
      </header>
      <main className="flex-grow-1 overflow-auto" style={{ marginTop: "80px" }}>
        <table className={"excel"}>
          <tbody>
            {tableSchema.map(
              (row, rowIdx) => <tr key={rowIdx}>{row.map(
                cell => <td title={cell.address} className={cell.classList} key={cell.address} style={cell.tdStyle} rowSpan={cell.rowSpan} colSpan={cell.colSpan}>
                  <div className={'cell-container'} style={cell.containerStyle}>
                    <div className={'cell-content'} style={cell.contentStyle}>{cell.htmlContent}</div>
                  </div>
                  <div className={"tag-container"}>{cell.comment}</div>
                </td>
              )}</tr>
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default App;
