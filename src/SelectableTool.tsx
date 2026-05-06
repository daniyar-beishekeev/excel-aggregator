import {type ReactNode, useRef} from "react";
import type React from "react";

export function SelectableTool({children, handler}: {children: ReactNode, handler: Record<string, any>}) {
  const getAddress = (e: React.MouseEvent<HTMLDivElement>): [number, number] => {
    let el = e.target as HTMLElement | null;
    while (el && el.tagName !== "TD") el = el.parentElement;
    if (!el) return [0, 0];
    return [
      Number(el.getAttribute('data-c') ?? '0'),
      Number(el.getAttribute('data-r') ?? '0')
    ];
  };

  const boxRef = useRef<HTMLDivElement | null>(null);
  const rectRef = useRef<HTMLDivElement | null>(null);

  const dragging = useRef<{
    active: boolean,
    x: number,
    y: number,
    mx: number,
    my: number,
    raf: null | number,
    address: [number, number]
  }>({
    active: false,
    x: 0,
    y: 0,
    mx: 0,
    my: 0,
    raf: null,
    address: [0, 0],
  });

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 2) return;
    dragging.current.address = getAddress(e);
    e.preventDefault();

    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    const x = e.clientX - r.left + el.scrollLeft;
    const y = e.clientY - r.top + el.scrollTop;

    dragging.current.active = true;
    dragging.current.x = x;
    dragging.current.y = y;

    const rect = rectRef.current;
    if (rect) {
      rect.style.display = "block";
      rect.style.left = `${x}px`;
      rect.style.top = `${y}px`;
      rect.style.width = `0px`;
      rect.style.height = `0px`;
      rect.style.borderColor = e.button === 2 ? "red" : "blue";
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging.current.active) return;

    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    dragging.current.mx = e.clientX - r.left + el.scrollLeft;
    dragging.current.my = e.clientY - r.top + el.scrollTop;

    if (dragging.current.raf) return;

    dragging.current.raf = requestAnimationFrame(() => {
      const d = dragging.current;

      const x1 = d.x;
      const y1 = d.y;
      const x2 = d.mx;
      const y2 = d.my;

      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);

      const rect = rectRef.current;

      if (rect) {
        rect.style.left = `${left}px`;
        rect.style.top = `${top}px`;
        rect.style.width = `${width}px`;
        rect.style.height = `${height}px`;
      }
      d.raf = null;
    });
  };

  const onMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 2) return;
    const eps = 13 * window.devicePixelRatio;
    if (Math.abs(dragging.current.x - dragging.current.mx) < eps && Math.abs(dragging.current.y - dragging.current.my) < eps) {

    } else {
      const f = handler?.setActiveCells;
      if (f && f instanceof Function)
        f(dragging.current.address, getAddress(e));
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
