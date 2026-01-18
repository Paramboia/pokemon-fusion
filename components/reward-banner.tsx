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
    <div className="w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 dark:from-yellow-600 dark:via-orange-600 dark:to-yellow-600 text-gray-900 dark:text-gray-100 py-2 px-4 border-b border-yellow-500 dark:border-yellow-700 shadow-sm">
      <div className="container mx-auto max-w-7xl flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">🏆</span>
          <span className="font-medium text-sm md:text-base">
            Free Credits for the Top 3 Fusions 🏆
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 p-1 hover:bg-yellow-500/20 dark:hover:bg-yellow-700/20 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4 md:h-5 md:w-5" />
        </button>
      </div>
    </div>
  );
}

