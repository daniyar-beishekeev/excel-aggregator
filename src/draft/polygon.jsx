import {StrictMode, useEffect, useState} from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import {MemoryUsage} from "../utils/MemoryUsage.jsx";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

function App() {
  if (!import.meta.env.DEV) return <>AVAILABLE IN DEV MODE ONLY</>;
  const [files, setFiles] = useState([]);
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
      files.forEach(file => file.id = crypto.randomUUID());
      const mode = 'sheetjs';
      if (mode === 'sheetjs') {
        Promise.all(
          files.map(async (file) => {
            const buffer = await file.arrayBuffer();
            return XLSX.read(buffer, { type: "array" });
          })
        ).then(console.log);
      } else if (mode === 'exceljs') {
        Promise.all(
          files.map(async (file) => {
            const buffer = await file.arrayBuffer();
            const wb = new ExcelJS.Workbook();
            await wb.xlsx.load(buffer);
            return wb;
          })
        ).then(console.log);
      }
      setFiles(files);
      console.log(files);
    })();
    return () => {};
  }, []);
  return <div>
    <MemoryUsage/>
    {files && <div>
      Loaded {files.length}
    </div>}
  </div>
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
