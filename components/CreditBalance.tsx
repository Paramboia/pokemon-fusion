'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCredits } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, CreditCard } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function CreditBalance() {
  const { isSignedIn, isLoaded } = useAuth();
  const { balance, isLoading, fetchBalance } = useCredits();

  useEffect(() => {
    if (isSignedIn && isLoaded) {
      fetchBalance();
    }
  }, [isSignedIn, isLoaded, fetchBalance]);

  if (!isSignedIn || !isLoaded) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2"
            asChild
          >
            <Link href="/credits">
              <Wallet className="h-4 w-4 text-primary" />
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="font-medium">{balance}</span>
              )}
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          className="bg-gradient-to-r from-primary/90 to-primary/70 text-white border-0 px-3 py-2 shadow-lg"
          sideOffset={5}
        >
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <p className="font-medium">Your credit balance</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 