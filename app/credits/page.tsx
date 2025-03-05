'use client';

import { useState } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Coins } from 'lucide-react';
import { PricingSection } from '@/components/ui/pricing-section';
import { PricingTier } from '@/components/ui/pricing-card';

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
    // Use placeholder SVG for all tiers
    const placeholderImage = '/pokemon/placeholder.svg';
    
    // Different colors for each tier
    const tierColors = [
      'bg-orange-100 text-orange-500',  // Starter - Charmander theme
      'bg-red-100 text-red-500',        // Standard - Charmeleon theme
      'bg-purple-100 text-purple-500',  // Value - Charizard theme
    ];
    
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
    };
  });

  return (
    <div className="container py-10">
      {/* Credit Balance */}
      <Card className="bg-muted mb-12">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Your Credit Balance</h2>
            <p className="text-muted-foreground">
              Use credits to generate unique Pokémon fusions
            </p>
          </div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Coins className="h-6 w-6 text-yellow-500" />
                <span>{balance}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Section */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <PricingSection
          title="Choose Your Plan"
          subtitle="Purchase credits to generate Pokémon fusions"
          tiers={tiers}
          frequencies={['monthly']} // We only have one-time purchases, not subscriptions
          onPurchase={handlePurchase}
          loadingPackageId={loadingPackageId}
        />
      )}

      {/* FAQ Section */}
      <Separator className="my-12" />
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">How do credits work?</h3>
            <p className="text-muted-foreground">
              Each credit allows you to generate one unique Pokémon fusion. Credits are deducted from your account when you create a fusion.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Do credits expire?</h3>
            <p className="text-muted-foreground">
              No, your purchased credits never expire and will remain in your account until used.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">Can I get a refund?</h3>
            <p className="text-muted-foreground">
              We do not offer refunds for purchased credits. All sales are final.
            </p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-2">How do I contact support?</h3>
            <p className="text-muted-foreground">
              If you have any questions or issues with your credits, please contact our support team at support@pokemonfusion.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 