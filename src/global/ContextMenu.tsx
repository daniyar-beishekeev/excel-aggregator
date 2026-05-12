import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";

type MenuDivider = { type: "divider" };
type MenuLabel   = { type: "label"; text: string };
type MenuItem    = {
  id:        string;
  label:     string;
  icon?:     string;
  disabled?: boolean;
  danger?:   boolean;
  sub?:      MenuEntry[];
};
export type MenuEntry = MenuDivider | MenuLabel | MenuItem;

export type MenuCallback = (item: MenuItem) => void;

function MenuPanel({ items, position, onClose, onAction, depth = 0 }: {
  items:    MenuEntry[];
  position: { x: number; y: number };
  onClose:  () => void;
  onAction: MenuCallback;
  depth?:   number;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [subPos, setSubPos] = useState<{ x: number; y: number } | null>(null);
  const [finalPos, setFinalPos] = useState({ x: -9999, y: -9999 });

  const subItems = activeId
    ? (items.find((i): i is MenuItem => "id" in i && i.id === activeId)?.sub ?? null)
    : null;

  useEffect(() => {
    if (!ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    setFinalPos({
      x: position.x + width  > innerWidth  ? position.x - width  : position.x,
      y: position.y + height > innerHeight ? position.y - height : position.y,
    });
  }, [position]);

  const handleItemEnter = useCallback((item: MenuItem, el: HTMLElement) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (!item.sub) {
      setActiveId(null);
      setSubPos(null);
      return;
    }
    hoverTimer.current = setTimeout(() => {
      const rect     = el.getBoundingClientRect();
      const menuRect = ref.current?.getBoundingClientRect();
      const subWidth = 210;
      const spaceRight = window.innerWidth - (menuRect?.right ?? 0);
      const x = spaceRight >= subWidth ? (menuRect?.right ?? 0) : (menuRect?.left ?? 0) - subWidth;
      setActiveId(item.id);
      setSubPos({ x, y: rect.top });
    }, 80);
  }, []);

  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  return (
    <>
      <ul
        ref={ref}
        className="list-unstyled mb-0"
        style={{
          position:     "fixed",
          left:         finalPos.x,
          top:          finalPos.y,
          zIndex:       9000 + depth * 10,
          minWidth:     210,
          background:   "var(--bs-body-bg)",
          border:       "1px solid var(--bs-border-color-translucent)",
          borderRadius: "0.5rem",
          padding:      "4px 0",
          boxShadow:    "0 8px 28px rgba(0,0,0,.14)",
        }}
      >
        {items.map((item, i) => {
          if ('type' in item) {
            if (item.type === "divider")
              return (
                <li key={i}>
                  <hr className="dropdown-divider my-1"
                      style={{ borderColor: "var(--bs-border-color-translucent)" }} />
                </li>
              );

            if (item.type === "label")
              return (
                <li key={i}>
                <span style={{
                  display: "block", padding: "3px 12px 1px",
                  fontSize: 10, fontWeight: 600, letterSpacing: ".08em",
                  textTransform: "uppercase", color: "var(--bs-secondary-color)",
                }}>
                  {item.text}
                </span>
                </li>
              );
          }

          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                disabled={item.disabled}
                onMouseEnter={(e) => handleItemEnter(item, e.currentTarget)}
                onClick={(e) => {
                  if (item.disabled || item.sub) return;
                  e.stopPropagation();
                  onAction?.(item);
                  onClose();
                }}
                onMouseOver={(e) => {
                  if (!item.disabled)
                    (e.currentTarget as HTMLElement).style.background = "var(--bs-tertiary-bg)";
                }}
                onMouseOut={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        9,
                  width:      "100%",
                  padding:    "5px 12px",
                  background: isActive ? "var(--bs-tertiary-bg)" : "transparent",
                  border:     "none",
                  borderRadius: 0,
                  fontSize:   13,
                  textAlign:  "left",
                  whiteSpace: "nowrap",
                  cursor:     "default",
                  color:      item.danger   ? "var(--bs-danger)" : "var(--bs-body-color)",
                  opacity:    item.disabled ? 0.45 : 1,
                  transition: "background 80ms",
                }}
              >
                {item.icon && (
                  <i className={`bi ${item.icon}`} aria-hidden="true"
                     style={{ fontSize: 14, width: 16, textAlign: "center", flexShrink: 0 }} />
                )}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.sub && (
                  <i className="bi bi-chevron-right" aria-hidden="true"
                     style={{ fontSize: 11, color: "var(--bs-secondary-color)" }} />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {subItems && subPos && (
        <MenuPanel
          items={subItems}
          position={subPos}
          onClose={onClose}
          onAction={onAction}
          depth={depth + 1}
        />
      )}
    </>
  );
}

export function useContextMenu(): [ReactNode, (e: Pick<MouseEvent, "clientX" | "clientY">, items: MenuEntry[], cb?: MenuCallback) => void] {
  const [state, setState] = useState<{
    open:  boolean;
    x:     number;
    y:     number;
    items: MenuEntry[];
  }>({
    open: false, x: 0, y: 0, items: [],
  });

  const openerEvent = useRef<number>(0);

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  useEffect(() => {
    if (!state.open) return;

    const handleClose = (e: MouseEvent) => {
      if (e.timeStamp - openerEvent.current < 10) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };

    window.addEventListener("click",       handleClose,       { capture: true });
    window.addEventListener("contextmenu", handleClose, { capture: true });

    return () => {
      window.removeEventListener("click",       handleClose,       { capture: true });
      window.removeEventListener("contextmenu", handleClose, { capture: true });
    };
  }, [state.open, close]);

  const cbRef = useRef<MenuCallback | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const openContextMenu = useCallback(
    (
      event:     Pick<MouseEvent, "clientX" | "clientY">,
      menuItems: MenuEntry[],
      callback?: MenuCallback,
    ) => {
      openerEvent.current = (event as MouseEvent).timeStamp ?? 0;
      cbRef.current = callback ?? null;
      setState({ open: true, x: event.clientX, y: event.clientY, items: menuItems});
    },
    [],
  );

  const content: ReactNode = state.open ? (
      <div ref={menuRef}>
        <MenuPanel
          items={state.items}
          position={{ x: state.x, y: state.y }}
          onClose={close}
          onAction={(item) => cbRef.current?.(item)}
        />
      </div>
  ) : null;

  return [content, openContextMenu];
}
