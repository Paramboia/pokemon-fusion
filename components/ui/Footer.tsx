"use client";

import Link from "next/link";
import { Info, Users } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <Link 
            href="/about"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <Info className="h-5 w-5" />
            <span>About Us</span>
          </Link>

          <p className="text-gray-400">
            © {new Date().getFullYear()} PokéFusion. All rights reserved.
          </p>

          <Link 
            href="https://discord.gg/pokefusion"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <Users className="h-5 w-5" />
            <span>Join Community</span>
          </Link>
        </div>
      </div>
    </footer>
  );
} 