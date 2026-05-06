//@ts-nocheck

import {type ReactNode, useRef} from "react";

export function SelectableTool({children}: {children: ReactNode}) {
  const getAddress = (e: Event) => {
    let el = e.target;
    while (el && el.tagName !== "TD") el = el.parentElement;
    if (!el) return [0, 0];
    return [el.getAttribute('data-c') ?? '0', el.getAttribute('data-r') ?? '0'].map(Number);
  };

  const boxRef = useRef(null);
  const rectRef = useRef(null);

  const dragging = useRef({
    active: false,
    x: 0,
    y: 0,
    mx: 0,
    my: 0,
    raf: null,
    address: [0, 0],
  });

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 2) return;
    dragging.current.address = getAddress(e);
    e.preventDefault();

    const el = boxRef.current;
    const r = el.getBoundingClientRect();

    const x = e.clientX - r.left + el.scrollLeft;
    const y = e.clientY - r.top + el.scrollTop;

    dragging.current.active = true;
    dragging.current.x = x;
    dragging.current.y = y;

    const rect = rectRef.current;
    rect.style.display = "block";
    rect.style.left = `${x}px`;
    rect.style.top = `${y}px`;
    rect.style.width = `0px`;
    rect.style.height = `0px`;
    rect.style.borderColor = e.button === 2 ? "red" : "blue";
  };

  const onMouseMove = (e) => {
    if (!dragging.current.active) return;

    const el = boxRef.current;
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

      rect.style.left = `${left}px`;
      rect.style.top = `${top}px`;
      rect.style.width = `${width}px`;
      rect.style.height = `${height}px`;

      d.raf = null;
    });
  };

  const setActiveCells = (address1, address2) => {
    let [c1, r1] = address1;
    let [c2, r2] = address2;
    if (c1 > c2) [c1, c2] = [c2, c1];
    if (r1 > r2) [r1, r2] = [r2, r1];
    if (r1 === -1) {
      r1 = 1;
      r2 = tableSize.totalRow;
    }
    if (c1 === -1) {
      c1 = 1;
      c2 = tableSize.totalCol;
    }
    document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    for(let r = r1; r <= r2; r++)
      for(let c = c1; c <= c2; c++) {
        const td = cellMapRef.current.get(c + ',' + r);
        if (td) {
          td.classList.add('active');
        }
      }
  }

  const onMouseUp = (e: MouseEvent) => {
    if (e.button !== 2) return;
    const eps = 13 * window.devicePixelRatio;
    if (Math.abs(dragging.current.x - dragging.current.mx) < eps && Math.abs(dragging.current.y - dragging.current.my) < eps) {

    } else {
      setActiveCells(dragging.current.address, getAddress(e));
    }
    dragging.current.active = false;
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
