"use client";

import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import { Toaster } from "sonner";
import { RetroGrid } from "@/components/ui/retro-grid";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen w-full relative">
      <RetroGrid />
      <Header />
      <main className="flex-1 w-full py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {children}
        </div>
      </main>
      <Footer />
      <Toaster richColors position="top-center" />
    </div>
  );
} 