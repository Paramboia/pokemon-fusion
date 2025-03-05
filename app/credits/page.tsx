'use client';

import { useState, useEffect } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Wallet, Flame } from 'lucide-react';
import { PricingSection } from '@/components/ui/pricing-section';
import { PricingTier } from '@/components/ui/pricing-card';
import { SparklesText } from "@/components/ui";

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
  const { balance, packages, isLoading, redirectToCheckout } = useCredits();
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [displayPackages, setDisplayPackages] = useState(FALLBACK_PACKAGES);

  // Use fallback packages if API call fails
  useEffect(() => {
    if (packages && packages.length > 0) {
      setDisplayPackages(packages);
    }
  }, [packages]);

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
        borderColor: 'border-orange-300',
        bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      },
      {
        name: 'Charmeleon',
        image: '/pokemon/charmeleon.png',
        color: 'from-orange-500 to-red-500',
        borderColor: 'border-orange-500',
        bgColor: 'bg-orange-50 dark:bg-red-950/40',
      },
      {
        name: 'Charizard',
        image: '/pokemon/charizard.png',
        color: 'from-red-600 to-orange-600',
        borderColor: 'border-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/40',
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
      borderColor: theme.borderColor,
      bgColor: theme.bgColor,
    };
  });

  return (
    <div className="flex flex-col items-center">
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
                ) : (
                  <div className="text-3xl font-bold text-primary flex items-center justify-center">
                    {balance || 0}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-muted p-3 text-center text-sm text-muted-foreground">
              <span className="inline-flex items-center">
                <Flame className="h-4 w-4 mr-1 text-orange-500" />
                Each fusion costs 1 credit. Purchase more credits below.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Section */}
      <div className="container max-w-6xl">
        <PricingSection
          title="Choose Your Tier"
          subtitle="Purchase credits to generate Pokémon fusions"
          tiers={tiers}
          frequencies={['monthly']} // We only have one-time purchases, not subscriptions
          onPurchase={handlePurchase}
          loadingPackageId={loadingPackageId}
        />
      </div>

      {/* FAQ Section */}
      <div className="text-center my-12">
        <SparklesText 
          text="Frequently Asked Questions"
          className="text-3xl md:text-4xl font-bold mb-4"
        />
        <p className="text-xl text-gray-600 dark:text-gray-200 mb-6">
          Everything you need to know about our credit system
        </p>
      </div>

      <div className="max-w-3xl w-full space-y-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-12">
        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">How do credits work?</h2>
          <p className="text-gray-600 dark:text-gray-200">
            Each credit allows you to generate one unique Pokémon fusion. Credits are deducted from your account when you create a fusion.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Do credits expire?</h2>
          <p className="text-gray-600 dark:text-gray-200">
            No, your purchased credits never expire and will remain in your account until used.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Can I get a refund?</h2>
          <p className="text-gray-600 dark:text-gray-200">
            We do not offer refunds for purchased credits. All sales are final.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">How do I contact support?</h2>
          <p className="text-gray-600 dark:text-gray-200">
            This is a one-person show, so I cannot really provide much support - but try to reach out on Twitter if anything serious happens. You can find me at <a href="https://x.com/Mr__Parente" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">@Miguel Parente</a>.
          </p>
        </section>
      </div>
    </div>
  );
} 