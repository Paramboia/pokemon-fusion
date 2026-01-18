"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const BANNER_STORAGE_KEY = "reward_banner_dismissed";

export function RewardBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem(BANNER_STORAGE_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_STORAGE_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-yellow-100 via-orange-50 to-yellow-100 dark:from-yellow-900/30 dark:via-orange-900/20 dark:to-yellow-900/30 text-gray-900 dark:text-gray-100 py-2 px-4 border-b border-yellow-200 dark:border-yellow-800/50 shadow-sm">
      <div className="container mx-auto max-w-7xl flex items-center justify-between relative">
        <div className="flex-1 flex items-center justify-center">
          <span className="font-medium text-sm md:text-base text-center">
            Free Credits for the Top 3 Fusions 🏆
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="absolute right-0 p-1 hover:bg-yellow-200/30 dark:hover:bg-yellow-800/30 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4 md:h-5 md:w-5" />
        </button>
      </div>
    </div>
  );
}

