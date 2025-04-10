'use client';

import { useState, useEffect } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Wallet, Flame, XCircle } from 'lucide-react';
import { PricingSection } from '@/components/ui/pricing-section';
import { SparklesText } from "@/components/ui/sparkles-text";
import { AuthGate } from '@/components/auth-gate';
import { useUser, useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Fallback data in case API calls fail
const FALLBACK_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 5,
    price: 1.50,
    currency: 'EUR',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_5_CREDITS || '',
  },
  {
    id: 'standard',
    name: 'Standard Pack',
    credits: 20,
    price: 5.00,
    currency: 'EUR',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_20_CREDITS || '',
  },
  {
    id: 'value',
    name: 'Value Pack',
    credits: 50,
    price: 10.00,
    currency: 'EUR',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_50_CREDITS || '',
  }
];

// Custom toast component for cancellation
function CancelToast({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={cn(
      "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
      "max-w-md w-full bg-red-50 border border-red-200 rounded-lg shadow-md",
      "px-4 py-3 flex items-center justify-between",
      "animate-in fade-in slide-in-from-top-5 duration-300"
    )}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-red-800 flex flex-col">
            <span className="font-bold">Purchase cancelled.</span>
            <span>You have not been charged.</span>
          </p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex text-red-500 hover:text-red-700 focus:outline-none"
        onClick={onClose}
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// Custom toast component for success
function SuccessToast({ onClose, message }: { onClose: () => void; message: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);

  // Split message into two parts
  const [firstLine, secondLine] = message.split('!');
  
  return (
    <div className={cn(
      "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
      "max-w-md w-full bg-green-50 border border-green-200 rounded-lg shadow-md",
      "px-4 py-3 flex items-center justify-between",
      "animate-in fade-in slide-in-from-top-5 duration-300"
    )}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-green-800 flex flex-col">
            <span className="font-bold">{firstLine}!</span>
            <span>{secondLine.trim()}</span>
          </p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex text-green-500 hover:text-green-700 focus:outline-none"
        onClick={onClose}
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function CreditsPage() {
  const { isLoaded: isUserLoaded, user } = useUser();
  const { getToken } = useAuth();
  const { balance, isLoading, error: balanceError, fetchBalance, redirectToCheckout } = useCredits();
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [displayPackages] = useState(FALLBACK_PACKAGES);
  const [showCancelToast, setShowCancelToast] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch balance when component mounts
  useEffect(() => {
    if (isUserLoaded && user) {
      console.log('Credits page - Fetching initial balance');
      fetchBalance();
    }
  }, [isUserLoaded, user, fetchBalance]);

  // Check URL for return_from_stripe parameter to show appropriate message
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const hasReturnParam = url.searchParams.has('return_from_stripe');
      const returnType = url.searchParams.get('return_from_stripe');
      const hasSessionId = url.searchParams.has('session_id');
      
      console.log('URL params check:', { hasReturnParam, returnType, hasSessionId, fullUrl: window.location.href });
      
      if (hasReturnParam && returnType === 'cancel') {
        // Handle cancellation
        console.log('Showing cancel toast notification');
        setShowCancelToast(true);
        
        // Also try using the regular toast as a backup
        toast.error('Purchase cancelled. You have not been charged.', {
          duration: 5000
        });
        
        // Clean the URL after a delay
        setTimeout(() => {
          console.log('Cleaning URL params');
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }, 2000);
      } else if (hasReturnParam && returnType === 'success' && hasSessionId) {
        // Handle successful purchase
        console.log('Showing success toast notification');
        setSuccessMessage('Payment successful! Credits added to your account.');
        setShowSuccessToast(true);
        
        // Also try using the regular toast as a backup
        toast.success('Payment successful! Credits added to your account.', {
          duration: 5000
        });
        
        // Refresh balance to show updated credits
        fetchBalance();
        
        // Clean the URL after a delay
        setTimeout(() => {
          console.log('Cleaning URL params');
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, '', cleanUrl);
        }, 2000);
      }
    }
  }, [fetchBalance]);

  const handleCloseToast = () => {
    setShowCancelToast(false);
  };
  
  const handleCloseSuccessToast = () => {
    setShowSuccessToast(false);
  };

  const handlePurchase = async (priceId: string, packageId: string) => {
    try {
      if (!isUserLoaded) {
        console.log('User not loaded yet');
        return;
      }

      if (!user) {
        toast.error('You must be signed in to purchase credits');
        return;
      }

      const token = await getToken();
      if (!token) {
        toast.error('Authentication required. Please sign in again.');
        return;
      }

      console.log('Starting checkout process with token');
      setLoadingPackageId(packageId);
      
      // Make sure the price ID is valid
      if (!priceId) {
        toast.error('Invalid package selected. Please try again.');
        return;
      }

      await redirectToCheckout(priceId);
    } catch (error) {
      console.error('Error during checkout:', error);
      toast.error('Failed to start checkout process. Please try again.');
    } finally {
      setLoadingPackageId(null);
    }
  };

  // Show loading state while user is not loaded
  if (!isUserLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {showCancelToast && <CancelToast onClose={handleCloseToast} />}
      {showSuccessToast && <SuccessToast onClose={handleCloseSuccessToast} message={successMessage} />}
      <AuthGate
        title="Create Pokémon Fusions"
        message="Sign in to create unique Pokémon fusions and save them to your collection!"
      >
        {/* Credit Balance */}
        <div className="container max-w-4xl mb-12 mt-6">
          <Card className="overflow-hidden border-0 shadow-md bg-white dark:bg-gray-800">
            <div className="bg-gradient-to-r from-primary/80 to-primary p-1"></div>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center">
                    <Wallet className="h-6 w-6 mr-2 text-primary" />
                    Your Credit Balance
                  </h2>
                  <p className="text-muted-foreground">
                    Use credits to generate unique Pokémon fusions
                  </p>
                </div>
                <div className="flex items-center justify-center bg-primary/10 rounded-full h-20 w-20 p-6">
                  {isLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : balanceError ? (
                    <div className="text-xl font-bold text-primary flex items-center justify-center">
                      <Flame className="h-5 w-5 mr-1" />
                      ?
                    </div>
                  ) : (
                    <div className={`text-3xl font-bold flex items-center justify-center ${
                      balance === 0 ? "text-red-500" : 
                      balance && balance > 0 ? "text-green-500" : 
                      "text-gray-800 dark:text-gray-200" // Default color for "?"
                    }`}>
                      {balance === null ? (
                        <span className="flex items-center">
                          <Flame className="h-5 w-5 mr-1" />
                          ?
                        </span>
                      ) : (
                        balance
                      )}
                    </div>
                  )}
                </div>
              </div>
              {balanceError && (
                <div className="px-6 pb-6 pt-0">
                  <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-3 rounded-md text-sm">
                    <p className="flex items-center">
                      <Flame className="h-4 w-4 mr-2 flex-shrink-0" />
                      {balanceError}
                    </p>
                  </div>
                </div>
              )}
              <div className="bg-muted p-3 text-center text-sm text-muted-foreground">
                <span className="inline-flex items-center">
                  <Flame className="h-4 w-4 mr-1 text-amber-500" />
                  Each fusion costs 1 credit. Purchase more credits below.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Section */}
        <div className="container max-w-6xl mb-12">
          <PricingSection
            title="Choose Your Tier"
            subtitle="Purchase credits to generate Pokémon fusions"
            tiers={displayPackages.map((pkg, index) => ({
              id: pkg.id,
              name: pkg.name,
              price: {
                monthly: pkg.price,
                yearly: pkg.price,
              },
              credits: pkg.credits,
              priceId: pkg.priceId,
              featured: index === 1,
              pokemonImage: `/pokemon/${['charmander', 'charmeleon', 'charizard'][index]}.png`,
              pokemonName: ['Charmander', 'Charmeleon', 'Charizard'][index],
              themeColor: [
                'from-orange-300 to-orange-400',
                'from-orange-500 to-red-500',
                'from-red-600 to-orange-600'
              ][index],
              bgColor: [
                'bg-orange-50 dark:bg-slate-900',
                'bg-orange-100 dark:bg-slate-800',
                'bg-red-50 dark:bg-slate-700'
              ][index],
            }))}
            frequencies={['monthly']}
            onPurchase={handlePurchase}
            loadingPackageId={loadingPackageId}
          />
        </div>

        {/* FAQ Section */}
        <div className="container max-w-4xl mb-12">
          <SparklesText 
            text="Frequently Asked Questions"
            className="text-3xl font-bold text-center mb-6"
          />
          <Card className="overflow-hidden border-0 shadow-md bg-white dark:bg-gray-800">
            <div className="bg-gradient-to-r from-primary/80 to-primary p-1"></div>
            <CardContent className="px-6 py-4">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">What are credits?</h2>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Credits are used to generate unique Pokémon fusions. Each fusion costs 1 credit. Fusions generated using the "simplified method" are free and don't consume any credits.
                  </p>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">How do I purchase credits?</h2>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Select one of the packages above and follow the checkout process. Credits will be added to your account immediately after payment.
                  </p>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Do credits expire?</h2>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    No, your credits never expire and will remain in your account until used.
                  </p>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Can I get a refund?</h2>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Credits are non-refundable once purchased. Please make sure to carefully consider your purchase before proceeding.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    </div>
  );
} 