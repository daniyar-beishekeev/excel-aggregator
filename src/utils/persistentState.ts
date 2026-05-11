import React, { useState, useEffect } from "react";

function parseReactVariable<T>(arg: T | (() => T)): T {
  if (typeof arg === "function")
    return (arg as () => T)();
  return arg;
}

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    let stored;
    try {
      stored = localStorage.getItem(key);
    } catch (err) {
      console.error(err);
      return parseReactVariable(initialValue);
    }
    try {
      return stored !== null ? JSON.parse(stored) : parseReactVariable(initialValue);
    } catch (err) {
      return stored as T;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  }, [key, value]);

  return [value, setValue];
}
