"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { MoonIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-black text-white">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold">
              PokéFusion
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                href="/" 
                className={cn(
                  "text-gray-300 hover:text-white transition-colors",
                  isActive("/") && "text-white font-medium"
                )}
              >
                Create
              </Link>
              <Link 
                href="/popular" 
                className={cn(
                  "text-gray-300 hover:text-white transition-colors",
                  isActive("/popular") && "text-white font-medium"
                )}
              >
                Popular
              </Link>
              <Link 
                href="/favorites" 
                className={cn(
                  "text-gray-300 hover:text-white transition-colors",
                  isActive("/favorites") && "text-white font-medium"
                )}
              >
                Favorites
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-800 transition-colors">
              <MoonIcon className="h-5 w-5" />
            </button>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "bg-gray-900 border border-gray-800",
                  userButtonPopoverText: "text-white",
                }
              }}
            />
          </div>
        </nav>
      </div>
    </header>
  );
} 