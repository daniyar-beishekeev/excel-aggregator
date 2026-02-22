import ExcelJS from "exceljs";
import {applyTint, extractThemeColors, indexedColors} from "./indexedColors.js";
import {isPlainObject} from "./utils.js";

export class workbookHolder{
  constructor(wb, file) {
    this.wb = wb;
    this.id = file.id;
    this.fileName = file.name;
    this.themeColors = extractThemeColors(wb._themes);
  }
  static async create(file) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    return new workbookHolder(wb, file);
  }
  /**
   * In pixels
   */
  getHeight (row) {
    return Math.floor((row?.height ?? row.worksheet.properties.defaultRowHeight ?? 15) * 1.3333);
  }
  /**
   * In pixels
   */
  getWidth (col) {
    return Math.floor(((col?.width ?? col.worksheet.properties.defaultColWidth ?? 8.43) * 7 + 5));
  }
  cellSize (cell) {
    if (cell.isMerged) {
      const range = cell.worksheet._merges[cell.master.address];
      let h = 0, w = 0;
      //TODO: Precalculate width and height
      for (let i = range.left; i <= range.right; i++) w += this.getWidth(cell.worksheet.getColumn(i));
      for (let i = range.top; i <= range.bottom; i++) h += this.getHeight(cell.worksheet.getRow(i));
      return {
        colSpan: range.right - range.left + 1,
        rowSpan: range.bottom - range.top + 1,
        w, h
      }
    } else {
      return {
        colSpan: 1,
        rowSpan: 1,
        w: this.getWidth(cell._column),
        h: this.getHeight(cell._row)
      }
    }
  }
  getValue (cell) {
    if (cell.value == null) return null;
    else if(['string', 'number'].includes(typeof cell.value)) return String(cell.value);
    else if(isPlainObject(cell.value)){
      const val = cell.value ?? {};
      if (cell.formula) {
        return String(cell.result?.error ?? cell.result ?? '');
      }else if (val.richText) {
        let value = cell.html
        value = val.richText.map(en => {
          const style = {};
          this.parseStyle(style, style, en, {font: true})
          return en.text.split('\n').map((text, idx) => {
            return (
              <>
                {idx > 0 && <br/>}
                <span style={style}>{text}</span>
              </>
            )
          })
        })
        value = <div>{value}</div>
        return value;
      }
    }
    return "NOT EVALUATED";
  }
  parseColor (obj, context = 'font') {
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
    if (obj.theme != null && this.themeColors[obj.theme]) {
      if (obj.tint)
        return applyTint(this.themeColors[obj.theme], obj.tint);
      else{
        // Special case, FIXME
        if (context === 'font' && obj.theme === 0)return '#fff';
        return context === 'fill' ? 'transparent' : def;
      }
    }
    return def;
  }
  renderComment (cell) {
    if (!cell.note) return null;
    return cell.note.texts.map(en => {
      const style = {};
      this.parseStyle(style, style, en, {font: true});
      return <span style={style}>{en.text}</span>
    });
  }
  parseStyle (style, style2, cell, parts = {alignment: true, border: true, font: true, fill: true}) {
    if (parts.alignment) this.parseAlignment(style2, cell.alignment);
    if (parts.border) this.parseBorder(style, cell);
    if (cell.font && parts.font) this.parseFont(style2, cell.font);
    if (cell.fill && parts.fill) this.parseFill(style2, cell.fill);
  }
  parseAlignment (style, alignment) {
    const al = alignment ?? {};

    const deg = al?.textRotation;
    if (deg === 90) {
      style.writingMode = "sideways-lr";
    }

    if (al?.wrapText) {
      style.whiteSpace = "pre-wrap";
      style.overflow = "hidden";
    }

    switch (al?.horizontal) {
      case "left":
        style.justifyContent = "flex-start";
        style.textAlign = "left";
        break;
      case "center":
      case "centerContinuous":
        style.justifyContent = "center";
        style.textAlign = "center";
        break;
      case "right":
        style.justifyContent = "flex-end";
        style.textAlign = "right";
        break;
      case "justify":
      case "distributed":
        style.justifyContent = "space-between";
        style.textAlign = "justify";
        break;
      case "fill":
        style.justifyContent = "flex-start";
        style.textAlign = "left";
        break;
    }

    // VERTICAL
    switch (al?.vertical) {
      case "top":
        style.alignItems = "flex-start";
        break;
      case "middle":
        style.alignItems = "center";
        break;
      case "bottom":
        style.alignItems = "flex-end";
        break;
      case "justify":
      case "distributed":
        style.alignItems = "stretch";
        break;
    }

    // SHRINK TO FIT
    if (al?.shrinkToFit) {
      style.minWidth = 0;
      style.flexShrink = 1;
    }

    // INDENT (approximation)
    if (typeof al?.indent === "number" && al.indent > 0) {
      style.paddingLeft = `${al.indent * 8 / 14}em`;
    }

    // READING ORDER
    if (al?.readingOrder === "rtl") {
      style.direction = "rtl";
    } else if (al?.readingOrder === "ltr") {
      style.direction = "ltr";
    }
  }
  static mapStyle (style) {
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
  }
  parseBorder (style, cell) {
    const ws = cell.worksheet;
    let leftTopCell = cell, rightBottomCell = cell;
    if (cell.isMerged) {
      const range = ws._merges[cell.master.address];
      leftTopCell = ws.getRow(range.top).getCell(range.left);
      rightBottomCell = ws.getRow(range.bottom).getCell(range.right);
    }
    const b = {
      ...(leftTopCell.border ?? {}),
      ...(rightBottomCell.border ?? {}),
      ...(cell.border ?? {})
    };

    const applySide = (side, cssProp) => {
      if (b[side]) {
        const styleStr = workbookHolder.mapStyle(b[side].style);
        const color = this.parseColor(b[side].color, 'border');
        style[cssProp] = `${styleStr} ${color}`;
      }
    };

    applySide("top", "borderTop");
    applySide("left", "borderLeft");
    applySide("bottom", "borderBottom");
    applySide("right", "borderRight");
  }
  parseFont (style, font) {
    const f = font;
    if (f.name) style.fontFamily = f.name;
    if (f.size) style.fontSize = `${f.size * 1.3333 / 14}em`;
    if (f.bold) style.fontWeight = "bold";
    if (f.italic) style.fontStyle = "italic";
    if (f.underline) style.textDecoration = "underline";
    if (f.strike) style.textDecoration = "line-through";
    if (f.color) style.color = this.parseColor(f.color, 'font');
  }
  parseFill (style, fill) {
    if (fill.type === "pattern" && fill.pattern === "solid" && fill.fgColor)
      style.backgroundColor = this.parseColor(fill.fgColor, 'fill');
  }
}
