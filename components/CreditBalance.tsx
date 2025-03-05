'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCredits } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import { Coins, Loader2 } from 'lucide-react';
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
              <Coins className="h-4 w-4 text-yellow-500" />
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="font-medium">{balance}</span>
              )}
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Your credit balance</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 