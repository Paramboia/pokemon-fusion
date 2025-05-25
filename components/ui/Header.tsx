"use client"

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MoonIcon, SunIcon, Menu, X, Home, Flame, Heart, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { UserButton } from "@/components/ui/user-button";
import { CreditBalance } from "@/components/CreditBalance";
import { event as gaEvent } from "@/lib/gtag";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // After mounting, we can safely show the UI that depends on the theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => pathname === path;
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Track theme change event
    gaEvent({
      action: 'theme_change',
      category: 'user_preference',
      label: newTheme,
      value: undefined
    });
  };
  
  console.log("Header component rendering");

  return (
    <header className="bg-transparent text-gray-800 dark:text-gray-200 w-full py-4 sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative w-10 h-10">
                <Image
                  src="/logo.webp"
                  alt="Pokémon Fusion Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="flex items-center space-x-10">
              <Link
                href="/"
                className={cn(
                  "flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors",
                  isActive("/") && "text-gray-900 dark:text-white font-medium"
                )}
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>
              <Link
                href="/popular"
                className={cn(
                  "flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors",
                  isActive("/popular") && "text-gray-900 dark:text-white font-medium"
                )}
              >
                <Flame className="h-5 w-5" />
                <span>Popular</span>
              </Link>
              <Link
                href="/favorites"
                className={cn(
                  "flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors",
                  isActive("/favorites") && "text-gray-900 dark:text-white font-medium"
                )}
              >
                <Heart className="h-5 w-5" />
                <span>Favorites</span>
              </Link>
              <Link
                href="/gallery"
                className={cn(
                  "flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors",
                  isActive("/gallery") && "text-gray-900 dark:text-white font-medium"
                )}
              >
                <Palette className="h-5 w-5" />
                <span>Gallery</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {mounted && (
                theme === 'dark' ? (
                  <MoonIcon className="h-5 w-5 text-gray-200" />
                ) : (
                  <SunIcon className="h-5 w-5 text-gray-600" />
                )
              )}
            </button>
            <CreditBalance />
            <UserButton />
            <button
              className="md:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
        </nav>
        
        {mobileMenuOpen && (
          <div className="md:hidden py-4 px-2 space-y-3 bg-white dark:bg-gray-800 rounded-lg mt-2 shadow-md">
            <Link
              href="/"
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                isActive("/") && "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="h-5 w-5 mr-2" />
              <span>Home</span>
            </Link>
            <Link
              href="/popular"
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                isActive("/popular") && "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Flame className="h-5 w-5 mr-2" />
              <span>Popular</span>
            </Link>
            <Link
              href="/favorites"
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                isActive("/favorites") && "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Heart className="h-5 w-5 mr-2" />
              <span>Favorites</span>
            </Link>
            <Link
              href="/gallery"
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                isActive("/gallery") && "text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Palette className="h-5 w-5 mr-2" />
              <span>Gallery</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
} 