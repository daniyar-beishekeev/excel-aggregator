import type ExcelJS from "exceljs";
import type {CellStyle, workbookHolder} from "./workbookHolder.tsx";

function horizontalAlignmentParse(st: CellStyle, hor: ExcelJS.Alignment['horizontal']): void {
  switch (hor) {
    case "justify":
    case "distributed":
    case "left":
    case "fill":
      st.containerStyle.justifyContent = "flex-start";
      st.contentStyle.textAlign = "left";
      break;
    case "center":
    case "centerContinuous":
      st.containerStyle.justifyContent = "center";
      st.contentStyle.textAlign = "center";
      break;
    case "right":
      st.containerStyle.justifyContent = "flex-end";
      st.contentStyle.textAlign = "right";
      break;
  }
}

function verticalAlignmentParse(st: CellStyle, ver: ExcelJS.Alignment['vertical']): void {
  switch (ver) {
    case "top":
      st.containerStyle.alignItems = "flex-start";
      st.contentStyle.alignItems = "flex-start";
      break;
    case "middle":
      st.containerStyle.alignItems = "center";
      st.contentStyle.alignItems = "center";
      break;
    case "bottom":
      st.containerStyle.alignItems = "flex-end";
      st.contentStyle.alignItems = "flex-end";
      break;
    case "justify":
    case "distributed":
      st.containerStyle.alignItems = "stretch";
      st.contentStyle.alignItems = "stretch";
      break;
  }
}

type textOrientation = "horizontal" | "vertical";
export function parseAlignment (wb: workbookHolder, st: CellStyle, alignment: Partial<ExcelJS.Alignment>): void {
  const deg = alignment?.textRotation;
  let orientation: textOrientation = 'horizontal';
  if (deg === 90) {
    orientation = 'vertical';
    st.contentStyle.writingMode = "sideways-lr";
  }

  if (alignment?.wrapText) {
    st.contentStyle.whiteSpace = "pre-wrap";
    st.contentStyle.overflow = "hidden";
  }

  if (alignment.horizontal)
    horizontalAlignmentParse(st, alignment.horizontal)

  if (alignment.vertical)
    verticalAlignmentParse(st, alignment.vertical)

  // INDENT (approximation)
  let indent: number = 0.375;
  if (typeof alignment?.indent === "number")
    indent = alignment.indent;
  indent = indent * 8 / 14;
  if (orientation === "horizontal") {
    if (st.contentStyle.textAlign === 'right')
      st.containerStyle.paddingRight = `${indent}em`;
    else
      st.containerStyle.paddingLeft = `${indent}em`;
  } else {
    if (st.contentStyle.alignItems === 'flex-end')
      st.containerStyle.paddingBottom = `${indent}em`;
    else
      st.containerStyle.paddingTop = `${indent}em`;
  }

  // SHRINK TO FIT
  if (alignment?.shrinkToFit) {
    st.contentStyle.minWidth = 0;
    st.contentStyle.flexShrink = 1;
  }

  // READING ORDER
  if (alignment?.readingOrder === "rtl") {
    st.contentStyle.direction = "rtl";
  } else if (alignment?.readingOrder === "ltr") {
    st.contentStyle.direction = "ltr";
  }
}
