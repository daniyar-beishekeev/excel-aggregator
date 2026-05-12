import {type ReactNode, useRef} from "react";
import type React from "react";

export function SelectableTool({children, handler}: {children: ReactNode, handler: Record<string, any>}) {
  const parentTd = (e: React.MouseEvent<HTMLDivElement>): HTMLElement | null => {
    let el = e.target as HTMLElement | null;
    while (el && el.tagName !== "TD") el = el.parentElement;
    return el;
  }
  const parentCellContent = (e: React.MouseEvent<HTMLDivElement>): HTMLElement | null => {
    let el = e.target as HTMLElement | null;
    while (el && !el.classList.contains('cell-content')) el = el.parentElement;
    return el;
  }
  const extractAddress = (el: HTMLElement | null): [number, number] => {
    if (!el) return [0, 0];
    return [
      Number(el.getAttribute('data-c') ?? '0'),
      Number(el.getAttribute('data-r') ?? '0')
    ];
  }

  const boxRef = useRef<HTMLDivElement | null>(null);
  const rectRef = useRef<HTMLDivElement | null>(null);

  const dragging = useRef<{
    active: boolean,
    x: number,
    y: number,
    raf: null | number,
    touchTime: number,
    address: [number, number]
  }>({
    active: false,
    x: 0,
    y: 0,
    raf: null,
    touchTime: 0,
    address: [0, 0],
  });

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 2) return;
    const rect = rectRef.current;
    if (!rect) return;
    const el = boxRef.current;
    if (!el) return;

    const td = parentTd(e);
    dragging.current.address = extractAddress(td);
    e.preventDefault();

    const r = el.getBoundingClientRect();
    const x = e.clientX + el.scrollLeft - r.left;
    const y = e.clientY + el.scrollTop - r.top;

    dragging.current.active = true;
    if(td?.classList?.contains?.('active')) {
      dragging.current.touchTime = Date.now();
    } else {
      dragging.current.touchTime = 0;
    }
    dragging.current.x = x;
    dragging.current.y = y;
    rect.style.display = "block";
    rect.style.left = `${x}px`;
    rect.style.top = `${y}px`;
    rect.style.width = `0px`;
    rect.style.height = `0px`;
    rect.style.borderColor = e.button === 2 ? "red" : "blue";
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging.current.active) return;
    if (dragging.current.raf) return;
    const rect = rectRef.current;
    if (!rect) return;
    const el = boxRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const mx = e.clientX + el.scrollLeft - r.left;
    const my = e.clientY + el.scrollTop - r.top;
    const {x, y} = dragging.current;
    const left = Math.min(x, mx);
    const top = Math.min(y, my);
    const width = Math.abs(x - mx);
    const height = Math.abs(y - my);

    dragging.current.raf = requestAnimationFrame(() => {
      rect.style.left = `${left}px`;
      rect.style.top = `${top}px`;
      rect.style.width = `${width}px`;
      rect.style.height = `${height}px`;
      dragging.current.raf = null;
    });
  };

  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 2) return;
    const [c1, r1] = dragging.current.address;

    const td = parentTd(e);
    const [c2, r2] = extractAddress(td);

    if ((c1 == c2 && r1 == r2) && Date.now() - dragging.current.touchTime < 200) {
      const cellContent = parentCellContent(e);
      const dataIdx = cellContent ? Number(cellContent.getAttribute('data-idx')) : null;
      const f = handler?.showCellOptions;
      if (dataIdx != null && f && f instanceof Function) {
        f(dataIdx, c1, r1, e);
      }
    } else {
      const f = handler?.setActiveCells;
      if (f && f instanceof Function) {
        f(c1, r1, c2, r2);
      }
    }
    dragging.current.active = false;
    if (rectRef.current)
      rectRef.current.style.display = "none";

    if (dragging.current.raf) {
      cancelAnimationFrame(dragging.current.raf);
      dragging.current.raf = null;
    }
  };

  return (
    <div
      style={{position: 'relative'}}
      ref={boxRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={rectRef}
        style={{
          position: "absolute",
          border: "2px solid blue",
          background: "rgba(0,0,255,0.15)",
          display: "none",
          pointerEvents: "none",
          zIndex: 9999
        }}
      />
      {children}
    </div>
  )
}
