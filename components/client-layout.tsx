"use client";

import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { registerServiceWorker } from "@/app/register-sw";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [useSimpleBackground, setUseSimpleBackground] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
    
    // Register service worker for PWA functionality
    registerServiceWorker();
    
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

  const isDarkMode = isMounted && theme === 'dark';

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Background container - positioned behind everything */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
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
            numSquares={12}
            maxOpacity={0.5}
            strokeDasharray="1 2"
            duration={4}
          />
        )}
        
        {/* Overlay gradient */}
        <div className={`absolute inset-0 bg-gradient-to-t ${
          isDarkMode 
            ? 'from-gray-900 to-transparent' 
            : 'from-white to-transparent'
        } to-80%`} />
      </div>
      
      {/* Content container - positioned above background */}
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        {isMounted && <PwaInstallPrompt />}
      </div>
    </div>
  );
} 