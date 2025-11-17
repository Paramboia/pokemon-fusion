"use client"

import * as React from "react"
import { PricingCard, PricingTier } from './pricing-card'
import { Tab } from "@/components/ui/pricing-tab"
import { SparklesText } from "@/components/ui/sparkles-text"

// Fallback pricing tiers in case props are not provided
const FALLBACK_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    price: {
      monthly: 1.50,
      yearly: 1.50,
    },
    credits: 5,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_5_CREDITS || '',
    featured: false,
    pokemonImage: '/pokemon/charmander.png',
    pokemonName: 'Charmander',
    themeColor: 'from-orange-300 to-orange-400',
    borderColor: 'border-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
  },
  {
    id: 'standard',
    name: 'Standard Pack',
    price: {
      monthly: 5.00,
      yearly: 5.00,
    },
    credits: 20,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_20_CREDITS || '',
    featured: true,
    pokemonImage: '/pokemon/charmeleon.png',
    pokemonName: 'Charmeleon',
    themeColor: 'from-orange-500 to-red-500',
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-50 dark:bg-red-950/40',
  },
  {
    id: 'value',
    name: 'Value Pack',
    price: {
      monthly: 10.00,
      yearly: 10.00,
    },
    credits: 50,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_50_CREDITS || '',
    featured: false,
    pokemonImage: '/pokemon/charizard.png',
    pokemonName: 'Charizard',
    themeColor: 'from-red-600 to-orange-600',
    borderColor: 'border-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
  },
];

interface PricingSectionProps {
  title: string
  subtitle: string
  tiers: PricingTier[]
  frequencies: string[]
  onPurchase: (priceId: string, packageId: string) => Promise<void>
  loadingPackageId: string | null
}

export function PricingSection({
  title,
  subtitle,
  tiers = FALLBACK_TIERS,
  frequencies,
  onPurchase,
  loadingPackageId
}: PricingSectionProps) {
  const [selectedFrequency, setSelectedFrequency] = React.useState(frequencies[0])

  // Add click event handler to any element that has the pricing data attributes
  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickable = target.closest('[data-price-id][data-package-id]') as HTMLElement | null;

      if (clickable) {
        const priceId = clickable.getAttribute('data-price-id');
        const packageId = clickable.getAttribute('data-package-id');

        if (priceId && packageId) {
          event.preventDefault();
          onPurchase(priceId, packageId);
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onPurchase]);

  return (
    <section className="flex flex-col items-center gap-10 py-10">
      <div className="space-y-7 text-center">
        <div className="space-y-4">
          <SparklesText 
            text={title}
            className="text-3xl md:text-4xl font-bold mb-4"
          />
          <p className="text-xl text-gray-600 dark:text-gray-200 mb-6">{subtitle}</p>
        </div>
        {frequencies.length > 1 && (
          <div className="mx-auto flex w-fit rounded-full bg-muted p-1">
            {frequencies.map((freq) => (
              <Tab
                key={freq}
                text={freq}
                selected={selectedFrequency === freq}
                setSelected={setSelectedFrequency}
                discount={freq === "yearly"}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid w-full max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => (
          <PricingCard
            key={tier.id}
            tier={tier}
            paymentFrequency={selectedFrequency}
            loadingPackageId={loadingPackageId}
          />
        ))}
      </div>
    </section>
  )
} 