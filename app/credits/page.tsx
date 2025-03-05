'use client';

import { useState } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Wallet, Flame } from 'lucide-react';
import { PricingSection } from '@/components/ui/pricing-section';
import { PricingTier } from '@/components/ui/pricing-card';
import { SparklesText } from "@/components/ui";

export default function CreditsPage() {
  const { balance, packages, isLoading, redirectToCheckout } = useCredits();
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);

  const handlePurchase = async (priceId: string, packageId: string) => {
    setLoadingPackageId(packageId);
    await redirectToCheckout(priceId);
    setLoadingPackageId(null);
  };

  // Map packages to pricing tiers
  const tiers: PricingTier[] = packages.map((pkg, index) => {
    // Use placeholder SVG for all tiers with different colors
    const placeholderImage = '/pokemon/placeholder.svg';
    
    // Pokemon names and colors for each tier based on Charmander evolution line
    const pokemonThemes = [
      {
        name: 'Charmander',
        color: 'from-orange-400 to-orange-500',
        borderColor: 'border-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950',
      },
      {
        name: 'Charmeleon',
        color: 'from-red-500 to-red-600',
        borderColor: 'border-red-500',
        bgColor: 'bg-red-50 dark:bg-red-950',
      },
      {
        name: 'Charizard',
        color: 'from-purple-500 to-orange-500',
        borderColor: 'border-purple-500',
        bgColor: 'bg-purple-50 dark:bg-purple-950',
      },
    ];
    
    const theme = pokemonThemes[index] || pokemonThemes[0];
    
    // Features for each tier
    const features = [
      'Generate unique Pokémon fusions',
      'Download high-quality images',
      'Save to favorites',
      'Share with friends',
    ];

    // Add tier-specific features
    if (index >= 1) {
      features.push('Priority generation queue');
    }
    if (index >= 2) {
      features.push('Early access to new features');
    }

    return {
      id: pkg.id,
      name: pkg.name,
      description: `Perfect for ${index === 0 ? 'beginners' : index === 1 ? 'regular users' : 'enthusiasts'}`,
      price: {
        monthly: pkg.price,
        yearly: pkg.price * 0.8, // 20% discount for yearly (not actually used)
      },
      credits: pkg.credits,
      priceId: pkg.priceId || '',
      featured: index === 1, // Make the middle package featured
      features: features,
      pokemonImage: placeholderImage,
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
        <Card className="overflow-hidden border-0 shadow-md">
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
                    {balance}
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
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="container max-w-6xl">
          <PricingSection
            title="Choose Your Plan"
            subtitle="Purchase credits to generate Pokémon fusions"
            tiers={tiers}
            frequencies={['monthly']} // We only have one-time purchases, not subscriptions
            onPurchase={handlePurchase}
            loadingPackageId={loadingPackageId}
          />
        </div>
      )}

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

      <div className="max-w-3xl w-full space-y-8 p-6 bg-white dark:bg-gray-800 dark:bg-opacity-50 rounded-lg shadow-sm mb-12">
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