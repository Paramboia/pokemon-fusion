"use client";

import Link from "next/link";
import { Info, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  console.log("Footer component rendering");
  
  return (
    <footer 
      className="bg-transparent dark:bg-transparent text-gray-800 dark:text-white py-10 w-full relative z-20"
      style={{ background: 'transparent !important' }}
    >
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link 
              href="/about"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Info className="h-5 w-5" />
              <span>About Us</span>
            </Link>
          </div>

          <div className="text-gray-500 dark:text-gray-300 text-sm text-center">
            &copy; {new Date().getFullYear()} PokéFusion.
            <br className="md:hidden" /> All rights reserved.
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/community"
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