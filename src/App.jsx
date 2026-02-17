import { useState, useRef } from "react";
import ExcelJS from "exceljs";
import "./App.css"
import indexedColors from "./indexedColors.js";
let fileId = 1;

const isPlainObject = value => {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

const extractThemeColors = (themes) => {
  if (!themes?.theme1) return [];

  const parser = new DOMParser();
  const xml = parser.parseFromString(themes.theme1, "application/xml");

  const scheme = xml.getElementsByTagName("a:clrScheme")[0];
  if (!scheme) return [];

  const readColor = (tag) => {
    const node = scheme.getElementsByTagName(`a:${tag}`)[0];
    if (!node) return null;
    const srgb = node.getElementsByTagName("a:srgbClr")[0];
    if (srgb) return srgb.getAttribute("val");
    const sys = node.getElementsByTagName("a:sysClr")[0];
    if (sys) return sys.getAttribute("lastClr");

    return null;
  };

  return [
    readColor("dk1"),
    readColor("lt1"),
    readColor("dk2"),
    readColor("lt2"),
    readColor("accent1"),
    readColor("accent2"),
    readColor("accent3"),
    readColor("accent4"),
    readColor("accent5"),
    readColor("accent6"),
  ];
};

const sampleFiles = Object.keys(import.meta.glob('/sample_excels/*.xlsx'));

function App() {
  /** @type {import('react').MutableRefObject<import('exceljs').Workbook | null>} */
  const wbRef = useRef(null);
  const [wsList, setWsList] = useState([]);
  const [curWs, setCurWs] = useState(null);
  const loadWorkbook = async (file) => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    wbRef.current = wb;
    wb.id = fileId++;
    setWsList(wb.worksheets.map(ws => [wb.id, ws.name, ws.id]));
    setCurWs(null);
  };

  const [sampleFile, setSampleFile] = useState(null);

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log("No file selected");
      return;
    }
    loadWorkbook(files[0]);
  };

  return (
    <>
      <div className={'no-print'} style={{display: "flex"}}>
        {wsList.map(ws => (
          <button key={ws} onClick={() => setCurWs([ws[0], ws[2]])}>{ws[1]}</button>
        ))}
        <div style={{marginLeft: 'auto'}}>
          {sampleFile && (
            <a href={sampleFile}><button>Download sample file</button></a>
          )}
          <select onChange={e => {
            setSampleFile(e.target.value);
            fetch(e.target.value).then(loadWorkbook);
          }}>
            <option selected disabled>*Sample files</option>
            {sampleFiles.map((file) => (
              <option key={file} value={file}>{file.split('/').at(-1)}</option>
            ))}
          </select>
          <input type="file" onChange={handleFileChange}/>
        </div>
      </div>
      {curWs && (
        <>
          {(() => {
              if(!wbRef.current) return null;
              const ws = wbRef.current.getWorksheet(curWs[1]);
              let totalRow = ws.rowCount;
              const totalCol = ws.columnCount;
              while (ws.getRow(totalRow).actualCellCount === 0) totalRow--;
              console.log(`${totalRow}x${totalCol}`)
              const themeColors = extractThemeColors(ws.workbook._themes);
              const zoom = (ws.pageSetup.scale ?? 100) / 100;
              const getHeight = row => Math.floor((row?.height ?? ws.properties.defaultRowHeight ?? 15) * 1.3333 * zoom);
              const getWidth = col => Math.floor(((col?.width ?? ws.properties.defaultColWidth ?? 8.43) * 7 + 5) * zoom);
              const applyTint = (hex, tint = 0) => {
                if (!hex) return "#000";
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                const tintChannel = (c) => {
                  if (tint < 0) return Math.round(c * (1 + tint));
                  return Math.round(c + (255 - c) * tint);
                };
                const nr = tintChannel(r);
                const ng = tintChannel(g);
                const nb = tintChannel(b);
                return `#${nr.toString(16).padStart(2, "0")}${ng
                  .toString(16)
                  .padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
              };
              const parseColor = (obj, context = 'font') => {
                const def = '#000';
                if (!obj) return def;
                if (obj.argb && typeof obj.argb === 'string') {
                  const hex = obj.argb.padStart(8, 'F');
                  const a = hex.slice(0, 2);
                  const r = hex.slice(2, 4);
                  const g = hex.slice(4, 6);
                  const b = hex.slice(6, 8);

                  const alpha = parseInt(a, 16) / 255;
                  if (alpha === 0) return context === 'fill' ? 'transparent' : def;
                  if (alpha < 1) return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`;
                  return `#${r}${g}${b}`;
                }
                if (obj.indexed != null) {
                  const idx = obj.indexed;
                  if (idx === 64) return context === 'fill' ? 'transparent' : def;
                  if (idx === 65) return def;
                  if (indexedColors[idx]) return indexedColors[idx];
                  return def;
                }
                if (obj.theme != null && themeColors[obj.theme]) {
                  if (obj.tint)
                    return applyTint(themeColors[obj.theme], obj.tint);
                  else{
                    // Special case, FIXME
                    if (context === 'font' && obj.theme === 0)return '#fff';
                    return context === 'fill' ? 'transparent' : def;
                  }
                }
                console.log('Unable to parse color', obj);
                return def;
              }
              console.log('LAST WS', ws, themeColors);
              const tableRows = [];

              for (let rowNum = 1; rowNum <= totalRow; rowNum++) {
                const row = ws.getRow(rowNum);
                const cells = [];
                for (let colNum = 1; colNum <= totalCol; colNum++) {
                  const cell = row.getCell(colNum)
                  let leftTopCell = cell, rightBottomCell = cell;
                  if(cell.master !== cell) continue;
                  let h = getHeight(row), w = getWidth(cell._column);
                  const parameters = {};
                  if (cell.isMerged) {
                    const range = ws._merges[cell.master.address];
                    h = 0; w = 0;
                    for (let i = range.left; i <= range.right; i++) w += getWidth(ws.getColumn(i));
                    for (let i = range.top; i <= range.bottom; i++) h += getHeight(ws.getRow(i));
                    if (range.left !== range.right) parameters.colSpan = range.right - range.left + 1;
                    if (range.bottom !== range.top) parameters.rowSpan = range.bottom - range.top + 1;
                    leftTopCell = ws.getRow(range.top).getCell(range.left);
                    rightBottomCell = ws.getRow(range.bottom).getCell(range.right);
                  }
                  const style = {};
                  const style2 = {};

                  const parseStyle = (style, style2, cell, parts = {alignment: true, border: true, font: true, fill: true}) => {
                    if (cell.alignment && parts.alignment) {
                      const al = cell.alignment;

                      const deg = al?.textRotation;
                      if (deg === 90) {
                        style.writingMode = "sideways-lr";
                      }

                      if (al?.wrapText) {
                        style.whiteSpace = "normal";
                        style.overflow = "hidden";
                      } else {
                        style.overflow = "visible";
                      }

                      switch (al?.horizontal) {
                        case "left":
                          style2.justifyContent = "flex-start";
                          style2.textAlign = "left";
                          break;
                        case "center":
                        case "centerContinuous":
                          style2.justifyContent = "center";
                          style2.textAlign = "center";
                          break;
                        case "right":
                          style2.justifyContent = "flex-end";
                          style2.textAlign = "right";
                          break;
                        case "justify":
                        case "distributed":
                          style2.justifyContent = "space-between";
                          style2.textAlign = "justify";
                          break;
                        case "fill":
                          style2.justifyContent = "flex-start";
                          style2.textAlign = "left";
                          break;
                      }

                      // VERTICAL
                      switch (al?.vertical) {
                        case "top":
                          style2.alignItems = "flex-start";
                          break;
                        case "middle":
                          style2.alignItems = "center";
                          break;
                        case "bottom":
                          style2.alignItems = "flex-end";
                          break;
                        case "justify":
                        case "distributed":
                          style2.alignItems = "stretch";
                          break;
                      }

                      // SHRINK TO FIT
                      if (al?.shrinkToFit) {
                        style2.minWidth = 0;
                        style2.flexShrink = 1;
                      }

                      // INDENT (approximation)
                      if (typeof al?.indent === "number" && al.indent > 0) {
                        style2.paddingLeft = `${al.indent * 8}px`; // 1 indent ≈ 8px
                      }

                      // READING ORDER
                      if (al?.readingOrder === "rtl") {
                        style2.direction = "rtl";
                      } else if (al?.readingOrder === "ltr") {
                        style2.direction = "ltr";
                      }
                    }
                    if (cell.border && parts.border) {
                      const b = {
                        ...(leftTopCell.border ?? {}),
                        ...(rightBottomCell.border ?? {}),
                        ...cell.border
                      };

                      const mapStyle = (style) => {
                        switch (style) {
                          case "thin":
                          case "hair":
                            return "1px solid";
                          case "medium":
                          case "mediumDashDot":
                          case "mediumDashDotDot":
                            return "2px solid";
                          case "thick":
                            return "3px solid";
                          case "double":
                            return "3px double";
                          case "dotted":
                            return "1px dotted";
                          case "dashDot":
                          case "dashDotDot":
                          case "slantDashDot":
                          case "mediumDashed":
                            return "1px dashed";
                          default:
                            return "1px solid";
                        }
                      };

                      const applySide = (side, cssProp) => {
                        if (b[side]) {
                          const styleStr = mapStyle(b[side].style);
                          const color = parseColor(b[side].color, 'border');
                          style[cssProp] = `${styleStr} ${color}`;
                        }
                      };

                      applySide("top", "borderTop");
                      applySide("left", "borderLeft");
                      applySide("bottom", "borderBottom");
                      applySide("right", "borderRight");
                    }
                    if (cell.font && parts.font) {
                      const f = cell.font;
                      if (f.name) style.fontFamily = f.name;
                      if (f.size) style.fontSize = `${f.size * zoom}px`;
                      if (f.bold) style.fontWeight = "bold";
                      if (f.italic) style.fontStyle = "italic";
                      if (f.underline) style.textDecoration = "underline";
                      if (f.strike) style.textDecoration = "line-through";
                      if (f.color) style.color = parseColor(f.color, 'font');
                    }
                    if (cell.fill && parts.fill) {
                      const fill = cell.fill;
                      if (fill.type === "pattern" && fill.pattern === "solid" && fill.fgColor)
                        style.backgroundColor = parseColor(fill.fgColor, 'fill');
                    }
                  }
                  //const custom = {border: true};
                  //parseStyle(style, style2, cell._column, custom);
                  //parseStyle(style, style2, cell._row, custom);
                  parseStyle(style, style2, cell);
                  let value = "";
                  if (cell.value == null) value = null;
                  else if(['string', 'number'].includes(typeof cell.value)) value = String(cell.value);
                  else if(isPlainObject(cell.value)){
                    const val = cell.value ?? {};
                    if (cell.formula) value = String(cell.result ?? '');
                    else if (val.richText) {
                      value = val.richText.map(en => {
                        const style = {};
                        parseStyle(style, style, en)
                        return en.text.split('\n').map((text, idx) => {
                          return (
                            <>
                              {idx > 0 && <br/>}
                              <span style={style}>{text}</span>
                            </>
                          )
                        })
                      })
                    }
                    else console.log("fail parse", cell)
                  }
                  cells.push(
                    <td data-addr={cell.address} key={cell.address} {...parameters} style={style}>
                      <div style={{
                        width: w,
                        height: h,
                        ...style2
                      }}>
                        {value}
                      </div>
                    </td>
                  );
                }


                tableRows.push(
                  <tr key={row.number}>
                    {cells}
                  </tr>
                );
              }

              return (
                <table className={"excel"} key={curWs}>
                  <tbody>{tableRows}</tbody>
                </table>
              );
            })()
          }
        </>
      )}
    </>
  );
}

export default App;
