import React, { useState, useRef, useCallback, Children} from "react";
import "./ScreenDivider.css";

type Direction = "vertical" | "horizontal";
function useSplitter(sz: number[], direction: Direction, minRatio: number) {
  const [sizes, setSizes] = useState<number[]>(sz);
  const dragging = useRef<{
    index: number;
    startPos: number;
    startSizes: number[];
    total: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback(
    (e: { clientX: number; clientY: number; preventDefault: () => void }, index: number) => {
      e.preventDefault();
      const rect = containerRef.current!.getBoundingClientRect();
      const total = direction === "vertical" ? rect.height : rect.width;
      dragging.current = {
        index,
        startPos: direction === "vertical" ? e.clientY : e.clientX,
        startSizes: [...sizes],
        total,
      };

      const onMove = (ev: MouseEvent | TouchEvent) => {
        if (!dragging.current) return;
        const { index, startPos, startSizes, total } = dragging.current;
        const clientPos =
          "touches" in ev
            ? direction === "vertical"
              ? ev.touches[0]!.clientY
              : ev.touches[0]!.clientX
            : direction === "vertical"
              ? ev.clientY
              : ev.clientX;
        const deltaPct = ((clientPos - startPos) / total) * 100;
        const combined = startSizes[index]! + startSizes[index + 1]!;
        const raw = startSizes[index]! + deltaPct;
        const clamped0 = Math.min(Math.max(raw, minRatio), combined - minRatio);
        const clamped1 = combined - clamped0;

        const next = [...startSizes];
        next[index] = clamped0;
        next[index + 1] = clamped1;
        setSizes(next);
      };

      const onUp = () => {
        dragging.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = direction === "vertical" ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onUp);
    },
    [sizes, direction]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent, index: number) => {
      const touch = e.touches[0]!;
      onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} }, index);
    },
    [onMouseDown]
  );

  return { sizes, setSizes, containerRef, onMouseDown, onTouchStart };
}

function Divider({ direction, onMouseDown, onTouchStart }: {
  direction: Direction;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
}) {
  return (
    <div
      className={`sd-divider sd-divider--${direction}`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <span className={`sd-grip-dot`} />
      <span className={`sd-grip-dot`} />
      <span className={`sd-grip-dot`} />
    </div>
  );
}

interface SplitterProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  root?: boolean;
  minRatio?: number;
  distribution?: number[];
}
export function VerticalSplitter(props: SplitterProps) {
  return Splitter('vertical', props);
}
export function HorizontalSplitter(props: SplitterProps) {
  return Splitter('horizontal', props);
}

function Splitter(direction: Direction, { children, style, className, root, distribution, minRatio }: SplitterProps) {
  const nodes = Children.toArray(children);
  const sz: number[] = distribution ?? Array(nodes.length).fill(100 / nodes.length);
  if (nodes.length != sz.length) {
    console.error('Children length and size distribution length mismatch');
    debugger;
  }
  if (Math.abs(sz.reduce((p, c) => p + c, 0) - 100) > 1){
    console.error('Invalid size distribution');
  }
  const { sizes, containerRef, onMouseDown, onTouchStart } = useSplitter(sz, direction, minRatio ?? 1);
  const sizeProp = direction === 'horizontal' ? 'width': 'height';
  return (
    <div
      ref={containerRef}
      className={["sd-container sd-container--" + direction, className].filter(Boolean).join(" ")}
      style={{ [sizeProp]: root ? ("100v" + sizeProp[0]) : "100%", ...style }}
    >
      {nodes.map((child, i) => (
        <div key={i} style={{ display: "contents" }}>
          <div className="sd-pane" style={{ [sizeProp]: `${sizes[i]}%` }}>
            {child}
          </div>
          {i < nodes.length - 1 && (
            <Divider
              direction={direction}
              onMouseDown={(e) => onMouseDown(e, i)}
              onTouchStart={(e) => onTouchStart(e, i)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
