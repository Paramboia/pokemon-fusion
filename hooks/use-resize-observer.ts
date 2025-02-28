"use client";

import { useEffect, useRef, useState } from "react";

interface Size {
  width?: number;
  height?: number;
}

interface UseResizeObserverOptions<T extends HTMLElement | SVGElement = HTMLElement> {
  ref: React.RefObject<T | null>;
  onResize?: (size: Size) => void;
}

export function useResizeObserver<T extends HTMLElement | SVGElement = HTMLElement>({
  ref,
  onResize,
}: UseResizeObserverOptions<T>): Size {
  const [size, setSize] = useState<Size>({});
  const previousSize = useRef<Size>({});

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;

      if (
        previousSize.current.width !== width ||
        previousSize.current.height !== height
      ) {
        const newSize = { width, height };
        previousSize.current = newSize;
        setSize(newSize);

        if (onResize) {
          onResize(newSize);
        }
      }
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, onResize]);

  return size;
} 