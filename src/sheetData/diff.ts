//@ts-nocheck

import type {cellValue} from "./parseWorksheet.ts";

export type diffLevel = 'excel' | 'loose' | 'coerce' | 'strict' | 'exact';

function isEmpty(cell: cellValue, level: diffLevel): boolean {
  if (cell.t === "z") return true;
  switch (level){
    case "excel":
      return (cell.t === "s" && cell.v === "") || (cell.t === "n" && cell.v === 0);
    case "loose":
    case "coerce":
      return cell.t === "s" && cell.v === "";
    case "strict":
    case "exact":
      return false;
  }
}

function compareSameType<T extends cellValue["t"]>(
  a: Extract<cellValue, { t: T }>,
  b: Extract<cellValue, { t: T }>,
  level: diffLevel
): boolean {
  switch (a.t) {
    case "b":
    case "n": {
      return a.v === b.v;
    }

    case "s": {
      const as = a.v as string;
      const bs = b.v as string;
      switch (level) {
        case "excel":
        case "loose":
          return as.trim().toLowerCase() === bs.trim().toLowerCase();
        case "coerce":
          return as.trim() === bs.trim();
        case "strict":
        case "exact":
          return as === bs;
        default:
          return false;
      }
    }

    case "d": {
      const at = a.v as Date;
      const bt = b.v as Date;
      return at.getTime() === bt.getTime();
    }

    case "e": {
      switch (level) {
        case "excel":
          return true;
        case "loose":
        case "coerce":
        case "strict":
        case "exact":
          return a.v === b.v;
      }
    }
  }
  return false;
}

function compareDifferentTypes(a: cellValue, b: cellValue, level: diffLevel): boolean {
  // Canonically order the pair so we only need to write each case once
  const [lo, hi] = a.t < b.t ? [a, b] : [b, a];
  //b d e n s z

  if (lo.t === "b" && hi.t === "n") {
    const loB = lo as { t: "b"; v: boolean };
    const hiN = hi as { t: "n"; v: number };
    // excel: 1 == TRUE, 0 == FALSE (how Excel itself treats them in formulas)
    if (level === "excel") return Number(loB.v) === hiN.v;
    // loose: 0/1 vs false/true is still too surprising — don't coerce
    return false;
  }

  // number ('n') vs string ('s')
  if (lo.t === "n" && hi.t === "s") {
    const loN = lo as { t: "n"; v: number };
    const hiS = hi as { t: "s"; v: string };
    const parsed = Number(hiS.v.trim());
    if (Number.isNaN(parsed)) return false;
    if (level === "excel") return loN.v === parsed;
    // loose: numeric strings are still strings — don't coerce
    return false;
  }

  // All other cross-type combinations (b/s, b/d, n/d, s/d, any/e) → not equal
  return false;
}

export function comparePair(a: cellValue, b: cellValue): boolean {
  return a.t === b.t && a.v === b.v;
  const aEmpty = isEmpty(a, level);
  const bEmpty = isEmpty(b, level);
  if (aEmpty && bEmpty) return true;
  if (aEmpty || bEmpty) return false;

  if (a.t === b.t) return compareSameType(a, b, level);

  switch (level) {
    case "excel":
    case "loose":
      return compareDifferentTypes(a, b, level);
    case "coerce":
    case "strict":
    case "exact":
      return false;
  }
}

export function isSame(values: cellValue[]): boolean {
  if (values.length < 2) return true;
  const [first, ...rest] = values as [cellValue, ...cellValue[]];
  return rest.every(item => comparePair(first, item));
}
