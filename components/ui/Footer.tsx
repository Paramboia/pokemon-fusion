"use client";

import Link from "next/link";
import { Info, Users, Heart, Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-transparent text-white py-8 mt-auto w-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link 
              href="/about"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <Info className="h-5 w-5" />
              <span>About</span>
            </Link>
            
            <Link 
              href="https://github.com/yourusername/pokemon-fusion"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <Github className="h-5 w-5" />
              <span>GitHub</span>
            </Link>
          </div>

          <p className="text-gray-400 text-center">
            © {new Date().getFullYear()} PokéFusion. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <Link 
              href="https://discord.gg/pokefusion"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <Users className="h-5 w-5" />
              <span>Join Community</span>
            </Link>
            
            <Link 
              href="/donate"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <Heart className="h-5 w-5" />
              <span>Support Us</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 