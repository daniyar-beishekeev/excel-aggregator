import type ExcelJS from "exceljs";
import {applyTint, indexedColors} from "./indexedColors.ts";
import type {AllowedCSS, workbookHolder} from "./workbookHolder.tsx";

export function parseColor (wb: workbookHolder, obj: Partial<ExcelJS.Color> | undefined, context: 'font' | 'border' | 'fill' = 'font'): NonNullable<AllowedCSS['color']> {
  const def: AllowedCSS['color'] = '#000';
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
  //@ts-expect-error
  const idx: number | undefined = obj.indexed;
  if (idx != null) {
    if (idx === 64) return context === 'fill' ? 'transparent' : def;
    if (idx === 65) return def;
    if (indexedColors[idx]) return indexedColors[idx];
    return def;
  }
  if (obj.theme != null && wb.themeColors[obj.theme]) {
    //@ts-expect-error
    const tint: number | undefined = obj.tint;
    if (tint)
      return applyTint(wb.themeColors[obj.theme], tint);
    else{
      // Special case, FIXME
      if (context === 'font' && obj.theme === 0)return '#fff';
      return context === 'fill' ? 'transparent' : def;
    }
  }
  return def;
}
