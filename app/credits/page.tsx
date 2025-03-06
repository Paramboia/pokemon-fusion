'use client';

import { useState, useEffect } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Wallet, Flame } from 'lucide-react';
import { PricingSection } from '@/components/ui/pricing-section';
import { PricingTier } from '@/components/ui/pricing-card';
import { SparklesText } from "@/components/ui/sparkles-text";
import { useAuthContext } from '@/contexts/auth-context';
import { AuthGate } from '@/components/auth-gate';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

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
  const { isSignedIn, isLoaded } = useAuthContext();
  const { balance, packages, isLoading, redirectToCheckout } = useCredits();
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [displayPackages, setDisplayPackages] = useState(FALLBACK_PACKAGES);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use fallback packages if API call fails
  useEffect(() => {
    if (packages && packages.length > 0) {
      setDisplayPackages(packages);
    }
  }, [packages]);

  // Handle API errors
  useEffect(() => {
    const checkApiStatus = async () => {
      if (!isSignedIn) {
        return; // Don't show error message if not signed in - AuthGate will handle this
      }
      
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          setErrorMessage('API service is currently unavailable. Please try again later.');
        }
      } catch (error) {
        console.error('Error checking API status:', error);
        setErrorMessage('Unable to connect to the server. Please check your connection and try again.');
      }
    };

    if (isLoaded) {
      checkApiStatus();
    }
  }, [isSignedIn, isLoaded]);

  const handlePurchase = async (priceId: string, packageId: string) => {
    setLoadingPackageId(packageId);
    await redirectToCheckout(priceId);
    setLoadingPackageId(null);
  };

  // Map packages to pricing tiers
  const tiers: PricingTier[] = displayPackages.map((pkg, index) => {
    // Pokemon names, images and colors for each tier based on Charmander evolution line
    const pokemonThemes = [
      {
        name: 'Charmander',
        image: '/pokemon/charmander.png',
        color: 'from-orange-300 to-orange-400',
        bgColor: 'bg-orange-50 dark:bg-slate-700',
      },
      {
        name: 'Charmeleon',
        image: '/pokemon/charmeleon.png',
        color: 'from-orange-500 to-red-500',
        bgColor: 'bg-orange-100 dark:bg-slate-800',
      },
      {
        name: 'Charizard',
        image: '/pokemon/charizard.png',
        color: 'from-red-600 to-orange-600',
        bgColor: 'bg-red-50 dark:bg-slate-900',
      },
    ];
    
    const theme = pokemonThemes[index] || pokemonThemes[0];

    return {
      id: pkg.id,
      name: pkg.name,
      price: {
        monthly: pkg.price,
        yearly: pkg.price,
      },
      credits: pkg.credits,
      priceId: pkg.priceId || '',
      featured: index === 1, // Make the middle package featured
      pokemonImage: theme.image,
      pokemonName: theme.name,
      themeColor: theme.color,
      bgColor: theme.bgColor,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <AuthGate
        title="Purchase Credits"
        message="Sign in to purchase and manage your Pokémon fusion credits!"
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
                  ) : errorMessage ? (
                    <div className="text-xl font-bold text-primary flex items-center justify-center">
                      <Flame className="h-5 w-5 mr-1" />
                      ?
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-primary flex items-center justify-center">
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
              {errorMessage && (
                <div className="px-6 pb-6 pt-0">
                  <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 p-3 rounded-md text-sm">
                    <p className="flex items-center">
                      <Flame className="h-4 w-4 mr-2 flex-shrink-0" />
                      {errorMessage}
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
            tiers={tiers}
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
                    Credits are used to generate unique Pokémon fusions. Each fusion costs 1 credit.
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
                    Refunds are available for unused credits within 30 days of purchase. Please contact support for assistance.
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