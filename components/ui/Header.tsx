"use client"

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { MoonIcon, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-transparent text-white w-full py-4">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Link href="/" className="flex items-center">
              <div className="relative h-12 w-12 mr-3">
                <Image
                  src="/logo.webp"
                  alt="PokéFusion Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 text-transparent bg-clip-text">PokéFusion</span>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                href="/" 
                className={cn(
                  "text-gray-300 hover:text-white transition-colors text-lg",
                  isActive("/") && "text-white font-medium"
                )}
              >
                Create
              </Link>
              <Link 
                href="/popular" 
                className={cn(
                  "text-gray-300 hover:text-white transition-colors text-lg",
                  isActive("/popular") && "text-white font-medium"
                )}
              >
                Popular
              </Link>
              <Link 
                href="/favorites" 
                className={cn(
                  "text-gray-300 hover:text-white transition-colors text-lg",
                  isActive("/favorites") && "text-white font-medium"
                )}
              >
                Favorites
              </Link>
              <Link 
                href="/about" 
                className={cn(
                  "text-gray-300 hover:text-white transition-colors text-lg",
                  isActive("/about") && "text-white font-medium"
                )}
              >
                About
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <UserButton afterSignOutUrl="/" />
            <button className="p-2 rounded-full hover:bg-gray-800 transition-colors">
              <MoonIcon className="h-5 w-5 text-gray-300" />
            </button>
            <button 
              className="md:hidden p-2 rounded-full hover:bg-gray-800 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-6 w-6 text-gray-300" />
            </button>
          </div>
        </nav>
        
        {mobileMenuOpen && (
          <div className="md:hidden py-4 px-2 space-y-3 bg-gray-900 bg-opacity-90 backdrop-blur-sm rounded-lg mt-2">
            <Link 
              href="/" 
              className={cn(
                "block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors",
                isActive("/") && "text-white bg-gray-800"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              Create
            </Link>
            <Link 
              href="/popular" 
              className={cn(
                "block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors",
                isActive("/popular") && "text-white bg-gray-800"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              Popular
            </Link>
            <Link 
              href="/favorites" 
              className={cn(
                "block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors",
                isActive("/favorites") && "text-white bg-gray-800"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              Favorites
            </Link>
            <Link 
              href="/about" 
              className={cn(
                "block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors",
                isActive("/about") && "text-white bg-gray-800"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
          </div>
        )}
      </div>
    </header>
  );
} 