"use client";

import Link from "next/link";
import { Info, Facebook } from "lucide-react";
import { useTheme } from "next-themes";

export function Footer() {
  const { theme } = useTheme();
  
  console.log("Footer component rendering");
  
  return (
    <footer className="bg-transparent text-gray-800 dark:text-white py-6 w-full border-t border-gray-200 dark:border-gray-800 relative z-30">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Link 
              href="/about"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Info className="h-5 w-5" />
              <span>About Us</span>
            </Link>
          </div>

          <div className="text-gray-500 dark:text-gray-300 text-sm text-center flex flex-col">
            <p>&copy; {new Date().getFullYear()} Pokémon Fusion</p>
            <p className="mt-1">Fan-made project</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Link 
              href="https://www.facebook.com/profile.php?id=61574000278243"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Facebook className="h-5 w-5" />
              <span>Join the Community</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 