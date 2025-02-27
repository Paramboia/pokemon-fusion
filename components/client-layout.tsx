"use client";

import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import { Toaster } from "sonner";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <Toaster richColors position="top-center" />
    </>
  );
} 