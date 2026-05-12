import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type React from "react";

const Ctx = createContext<{
  observe: (el: Element, cb: (v: boolean) => void) => void;
  unobserve: (el: Element) => void;
} | null>(null);

export function TableVisibilityProvider({ children, rootMargin = "300px" }: {
  children: React.ReactNode;
  rootMargin?: string;
}) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const callbacksRef = useRef(new Map<Element, (v: boolean) => void>());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          callbacksRef.current.get(entry.target)?.(entry.isIntersecting);
        });
      },
      { rootMargin }
    );

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [rootMargin]);

  const observe = useCallback((el: Element, cb: (v: boolean) => void) => {
    callbacksRef.current.set(el, cb);
    observerRef.current?.observe(el);
  }, []);

  const unobserve = useCallback((el: Element) => {
    callbacksRef.current.delete(el);
    observerRef.current?.unobserve(el);
  }, []);

  return <Ctx.Provider value={{ observe, unobserve }}>{children}</Ctx.Provider>;
}

export function useCellVisibility() {
  const ctx = useContext(Ctx);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!ctx || !ref.current) return;
    const el = ref.current;
    ctx.observe(el, setVisible);
    return () => ctx.unobserve(el);
  }, [ctx]);

  return [ref, visible] as const;
}
