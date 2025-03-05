'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCredits } from '@/hooks/useCredits';
import { Wallet, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

export function CreditBalance() {
  const { isSignedIn, isLoaded } = useAuth();
  const { balance, isLoading, fetchBalance, error } = useCredits();

  // Fetch balance when component mounts and when auth state changes
  useEffect(() => {
    if (isSignedIn && isLoaded) {
      fetchBalance();
    }
  }, [isSignedIn, isLoaded, fetchBalance]);

  // Refresh balance every 30 seconds
  useEffect(() => {
    if (!isSignedIn || !isLoaded) return;
    
    const intervalId = setInterval(() => {
      fetchBalance();
    }, 30000); // 30 seconds
    
    return () => clearInterval(intervalId);
  }, [isSignedIn, isLoaded, fetchBalance]);

  if (!isSignedIn || !isLoaded) {
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