import type { Metadata } from "next";
import { GeistSans } from 'geist/font'
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import ClientLayout from "@/components/client-layout";

const geistSans = GeistSans;

export const metadata: Metadata = {
  title: "PokéFusion",
  description: "Create and share Pokemon fusions",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} min-h-screen flex flex-col bg-gray-950 text-white`}>
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ClientLayout>{children}</ClientLayout>
            <Toaster richColors position="top-center" />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
