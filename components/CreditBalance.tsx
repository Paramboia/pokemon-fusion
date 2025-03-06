'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCredits } from '@/hooks/useCredits';
import { Wallet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';

export function CreditBalance() {
  const { isLoaded } = useUser();
  const { balance, isLoading, fetchBalance, error } = useCredits();

  // Fetch balance when component mounts
  useEffect(() => {
    if (isLoaded) {
      fetchBalance();
    }
  }, [isLoaded, fetchBalance]);

  // Refresh balance every 30 seconds
  useEffect(() => {
    if (!isLoaded) return;
    
    const intervalId = setInterval(() => {
      fetchBalance();
    }, 30000); // 30 seconds
    
    return () => clearInterval(intervalId);
  }, [isLoaded, fetchBalance]);

  if (!isLoaded) {
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
        <span className="font-medium text-sm">{balance !== null ? balance : '?'}</span>
      )}
    </Link>
  );
} 