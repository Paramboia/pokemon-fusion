'use client';

import { useState } from 'react';
import { useCredits } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, Coins } from 'lucide-react';

export default function CreditsPage() {
  const { balance, packages, isLoading, redirectToCheckout } = useCredits();
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);

  const handlePurchase = async (priceId: string, packageId: string) => {
    setLoadingPackageId(packageId);
    await redirectToCheckout(priceId);
    setLoadingPackageId(null);
  };

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-2">Credits</h1>
      <p className="text-muted-foreground mb-8">
        Purchase credits to generate Pokémon fusions
      </p>

      {/* Credit Balance */}
      <div className="bg-muted p-6 rounded-lg mb-8 flex items-center justify-between">
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
      </div>

      {/* Credit Packages */}
      <h2 className="text-2xl font-bold mb-4">Purchase Credits</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {isLoading ? (
          <div className="col-span-3 flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          packages.map((pkg) => (
            <Card key={pkg.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>
                  {pkg.credits} credits
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-3xl font-bold mb-2">
                  {pkg.currency === 'EUR' ? '€' : '$'}{pkg.price.toFixed(2)}
                </div>
                <p className="text-muted-foreground text-sm">
                  {pkg.currency === 'EUR' ? '€' : '$'}{(pkg.price / pkg.credits).toFixed(2)} per credit
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handlePurchase(pkg.priceId, pkg.id)}
                  disabled={loadingPackageId === pkg.id || !pkg.priceId}
                >
                  {loadingPackageId === pkg.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Buy Now
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* FAQ Section */}
      <Separator className="my-8" />
      <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">How do credits work?</h3>
          <p className="text-muted-foreground">
            Each credit allows you to generate one unique Pokémon fusion. Credits are deducted from your account when you create a fusion.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">Do credits expire?</h3>
          <p className="text-muted-foreground">
            No, your purchased credits never expire and will remain in your account until used.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">Can I get a refund?</h3>
          <p className="text-muted-foreground">
            We do not offer refunds for purchased credits. All sales are final.
          </p>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">How do I contact support?</h3>
          <p className="text-muted-foreground">
            If you have any questions or issues with your credits, please contact our support team at support@pokemonfusion.com.
          </p>
        </div>
      </div>
    </div>
  );
} 