"use client";

import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use client-side rendering for the animated grid pattern
  const [isMounted, setIsMounted] = useState(false);
  const [useSimpleBackground, setUseSimpleBackground] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
    
    // If the animated background causes issues, we can fall back to a simple one
    try {
      // Try to detect if we're having performance issues
      const startTime = performance.now();
      setTimeout(() => {
        const endTime = performance.now();
        // If the timeout took significantly longer than expected, we might be having performance issues
        if (endTime - startTime > 200) {
          setUseSimpleBackground(true);
        }
      }, 100);
    } catch (e) {
      // If there's any error, use the simple background
      setUseSimpleBackground(true);
    }
    
    return () => setIsMounted(false);
  }, []);

  console.log("ClientLayout rendering");

  const isDarkMode = isMounted && theme === 'dark';

  return (
    <div className="flex flex-col min-h-screen w-full dark:bg-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="absolute inset-0 overflow-hidden">
        {/* Simple gradient background as fallback */}
        <div className={`absolute inset-0 ${
          isDarkMode 
            ? 'bg-gradient-to-b from-gray-900 to-gray-800' 
            : 'bg-gradient-to-b from-gray-100 to-white'
        }`} />
        
        {/* Only render the animated grid when client-side and not using simple background */}
        {isMounted && !useSimpleBackground && (
          <AnimatedGridPattern 
            className={isDarkMode ? "fill-gray-800 stroke-gray-700" : "fill-gray-200 stroke-gray-300"}
            width={80}
            height={80}
            numSquares={8}
            maxOpacity={0.3}
            strokeDasharray="1 2"
            duration={4}
          />
        )}
        
        {/* Static grid pattern as fallback */}
        {useSimpleBackground && (
          <div className="absolute inset-0 bg-grid-pattern opacity-20 dark:opacity-10" />
        )}
        
        {/* Overlay gradient */}
        <div className={`absolute inset-0 bg-gradient-to-t ${
          isDarkMode 
            ? 'from-gray-900 to-transparent' 
            : 'from-white to-transparent'
        } to-80%`} />
      </div>
      <Header />
      <main className="flex-1 w-full py-12 relative z-10 mb-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {children}
        </div>
      </main>
      
      <div className="relative z-10 bg-transparent dark:bg-transparent">
        <Footer />
      </div>
      <Toaster richColors position="top-center" theme={isDarkMode ? "dark" : "light"} />
    </div>
  );
} 