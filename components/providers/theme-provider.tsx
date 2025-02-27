"use client";

import { ThemeProvider } from "@/contexts/theme-context";
import { ReactNode } from "react";

export default function ClientThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
} 