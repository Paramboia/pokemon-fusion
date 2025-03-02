"use client";

import React, { useEffect, useState, CSSProperties } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SparklesTextProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
  colors?: {
    first: string;
    second: string;
  };
}

interface Sparkle {
  id: string;
  x: string;
  y: string;
  color: string;
  delay: number;
  scale: number;
}

const SparklesText: React.FC<SparklesTextProps> = ({
  text,
  colors = {
    first: "#FFD700", // Gold
    second: "#E83F6F", // Pink
  },
  className,
  ...props
}) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  const generateSparkle = (): Sparkle => {
    return {
      id: Math.random().toString(36).substring(2),
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      color: Math.random() > 0.5 ? colors.first : colors.second,
      delay: Math.random() * 0.5,
      scale: 0.5 + Math.random() * 0.5,
    };
  };

  const initializeStars = () => {
    const initialSparkles = Array.from({ length: 10 }, () => generateSparkle());
    setSparkles(initialSparkles);
  };

  const updateStars = () => {
    setSparkles((prev) => {
      // Remove one random sparkle
      if (prev.length > 0 && Math.random() > 0.7) {
        const indexToRemove = Math.floor(Math.random() * prev.length);
        return [
          ...prev.slice(0, indexToRemove),
          ...prev.slice(indexToRemove + 1),
        ];
      }

      // Add a new sparkle occasionally
      if (Math.random() > 0.7) {
        return [...prev, generateSparkle()];
      }

      return prev;
    });
  };

  useEffect(() => {
    initializeStars();
    const interval = setInterval(updateStars, 100);

    return () => clearInterval(interval);
  }, [colors.first, colors.second]);

  return (
    <div
      className={cn("text-6xl font-bold text-gray-800", className)}
      {...props}
      style={{
        "--sparkles-first-color": `${colors.first}`,
        "--sparkles-second-color": `${colors.second}`,
      } as CSSProperties}
    >
      <span className="relative inline-block">
        {sparkles.map((sparkle) => (
          <Sparkle key={sparkle.id} {...sparkle} />
        ))}
        <strong className="dark:!text-white" style={{ color: 'inherit' }}>
          {text}
        </strong>
      </span>
    </div>
  );
};

const Sparkle: React.FC<Sparkle> = ({ id, x, y, color, delay, scale }) => {
  return (
    <motion.svg
      key={id}
      className="pointer-events-none absolute z-20"
      initial={{ opacity: 0, left: x, top: y }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, scale, 0],
        rotate: [75, 120, 150],
      }}
      transition={{ duration: 0.8, repeat: Infinity, delay }}
      width="21"
      height="21"
      viewBox="0 0 21 21"
    >
      <path
        d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
        fill={color}
      />
    </motion.svg>
  );
};

export { SparklesText }; 