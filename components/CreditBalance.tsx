'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCredits } from '@/hooks/useCredits';
import { Wallet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';

export function CreditBalance() {
  const { isLoaded, user } = useUser();
  const { balance, isLoading, fetchBalance, error } = useCredits();

  // Single effect to handle both initial fetch and refresh
  useEffect(() => {
    if (!isLoaded || !user) return;

    // Initial fetch
    fetchBalance();

    // Set up refresh interval
    const intervalId = setInterval(fetchBalance, 30000); // 30 seconds

    // Cleanup
    return () => clearInterval(intervalId);
  }, [isLoaded, user, fetchBalance]);

  if (!isLoaded || !user) {
    return null;
  }

  return (
    <Link 
      href="/credits"
      className={cn(
        "flex items-center gap-1 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
        error ? "text-red-500" : ""
      )}
      title={error ? "Error loading credits" : "Your credit balance"}
    >
      <Wallet className={cn("h-4 w-4", error ? "text-red-500" : "text-primary")} />
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className={cn(
          "font-medium text-sm",
          balance === 0 ? "text-red-500" : 
          balance && balance > 0 ? "text-green-500" : 
          "" // Default color (black/current text color) for "?"
        )}>
          {balance !== null ? balance : '?'}
        </span>
      )}
    </Link>
  );
} 