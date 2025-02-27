"use client";

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const ClientThemeProvider = dynamic(
  () => import('./theme-provider'),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClientThemeProvider>
      {children}
    </ClientThemeProvider>
  );
} 