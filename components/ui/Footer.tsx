"use client";

import Link from "next/link";
import { Info } from "lucide-react";

export function Footer() {
  console.log("Footer component rendering");
  
  return (
    <footer className="bg-transparent text-gray-800 py-8 mt-auto w-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link 
              href="/about"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Info className="h-5 w-5" />
              <span>About</span>
            </Link>
          </div>

          <div className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} PokéFusion. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
} 