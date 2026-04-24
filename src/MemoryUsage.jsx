import { useEffect, useState } from "react";

export function MemoryUsage() {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!performance?.memory) {
      setText("Memory API not supported");
      return;
    }

    const interval = setInterval(() => {
      const { usedJSHeapSize, totalJSHeapSize } = performance.memory;

      const usedMB = (usedJSHeapSize / 1024 / 1024).toFixed(1);
      const totalMB = (totalJSHeapSize / 1024 / 1024).toFixed(1);

      setText(`${usedMB} / ${totalMB} MB`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return <div>{text}</div>;
}
