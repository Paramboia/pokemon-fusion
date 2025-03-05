"use client"

import * as React from "react"
import { PricingCard, type PricingTier } from "@/components/ui/pricing-card"
import { Tab } from "@/components/ui/pricing-tab"

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
  tiers,
  frequencies,
  onPurchase,
  loadingPackageId
}: PricingSectionProps) {
  const [selectedFrequency, setSelectedFrequency] = React.useState(frequencies[0])

  // Add click event handler to buttons
  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button[data-price-id]');
      
      if (button) {
        const priceId = button.getAttribute('data-price-id');
        const packageId = button.getAttribute('data-package-id');
        
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
          <h1 className="text-4xl font-medium md:text-5xl">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
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