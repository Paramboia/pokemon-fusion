'use client';

import { useState, useEffect } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Wallet, Flame } from 'lucide-react';
import { PricingSection } from '@/components/ui/pricing-section';
import { SparklesText } from "@/components/ui/sparkles-text";
import { AuthGate } from '@/components/auth-gate';
import { useUser, useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

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

export default function CreditsPage() {
  const { isLoaded: isUserLoaded, user } = useUser();
  const { getToken } = useAuth();
  const { balance, isLoading, error: balanceError, fetchBalance, redirectToCheckout } = useCredits();
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [displayPackages] = useState(FALLBACK_PACKAGES);

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
      if (url.searchParams.has('return_from_stripe') && url.searchParams.get('return_from_stripe') === 'cancel') {
        // This was a redirect from a canceled Stripe checkout
        toast.info('Payment canceled. You have not been charged.');
        
        // Clean the URL
        url.searchParams.delete('return_from_stripe');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

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