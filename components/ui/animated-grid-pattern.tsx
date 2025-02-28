"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AnimatedGridPatternProps extends React.SVGProps<SVGSVGElement> {
  /**
   * The width of each cell in the grid
   * @default 40
   */
  width?: number;
  /**
   * The height of each cell in the grid
   * @default 40
   */
  height?: number;
  /**
   * The x position of the grid
   * @default 0
   */
  x?: number;
  /**
   * The y position of the grid
   * @default 0
   */
  y?: number;
  /**
   * The number of squares to show
   * @default 20
   */
  numSquares?: number;
  /**
   * The maximum opacity of the squares
   * @default 0.5
   */
  maxOpacity?: number;
  /**
   * The duration of the animation in seconds
   * @default 2
   */
  duration?: number;
  /**
   * The stroke dash array for the grid lines
   * @default "1 1"
   */
  strokeDasharray?: string;
}

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = 0,
  y = 0,
  numSquares = 20,
  maxOpacity = 0.5,
  duration = 2,
  strokeDasharray = "1 1",
  className,
  ...props
}: AnimatedGridPatternProps) {
  const id = useId();
  const [squares, setSquares] = useState<{ pos: [number, number]; id: number }[]>([]);
  
  // Simplified approach - use fixed dimensions instead of dynamic ones
  useEffect(() => {
    // Use a fixed grid size for better performance
    const cols = 12;
    const rows = 8;
    
    // Limit the number of squares
    const adjustedNumSquares = Math.min(numSquares, 10);
    
    try {
      const initialSquares = Array.from({ length: adjustedNumSquares }).map((_, i) => ({
        pos: [
          Math.floor(Math.random() * cols),
          Math.floor(Math.random() * rows),
        ] as [number, number],
        id: i,
      }));
      
      setSquares(initialSquares);
    } catch (error) {
      console.error("Error initializing animated grid pattern:", error);
      setSquares([]);
    }
  }, [numSquares]);
  
  const updateSquarePosition = (id: number) => {
    try {
      setSquares((prev) => {
        const cols = 12;
        const rows = 8;
        
        return prev.map((square) => {
          if (square.id === id) {
            return {
              ...square,
              pos: [
                Math.floor(Math.random() * cols),
                Math.floor(Math.random() * rows),
              ] as [number, number],
            };
          }
          return square;
        });
      });
    } catch (error) {
      console.error("Error updating square position:", error);
    }
  };
  
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [x, y], id }, index) => (
          <motion.rect
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: 1,
              delay: index * 0.2,
              repeatType: "reverse",
            }}
            onAnimationComplete={() => updateSquarePosition(id)}
            key={`${x}-${y}-${index}`}
            width={width - 1}
            height={height - 1}
            x={x * width + 1}
            y={y * height + 1}
            fill="currentColor"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  );
} 