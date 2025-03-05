import Image from "next/image"
import { Check, CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface PricingTier {
  name: string
  description: string
  price: {
    monthly: number
    yearly: number
  }
  features: string[]
  featured?: boolean
  credits: number
  priceId: string
  id: string
  pokemonImage: string
}

interface PricingCardProps {
  tier: PricingTier
  paymentFrequency: string
  loadingPackageId?: string | null
}

export function PricingCard({ tier, paymentFrequency, loadingPackageId }: PricingCardProps) {
  const price = paymentFrequency === "monthly" ? tier.price.monthly : tier.price.yearly
  const pricePerCredit = (price / tier.credits).toFixed(2)
  const isLoading = loadingPackageId === tier.id

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden border",
        tier.featured && "border-primary shadow-md"
      )}
    >
      <CardHeader className={cn("flex flex-col items-center space-y-1 pb-2", 
        tier.featured && "bg-primary/10")}>
        <div className="relative h-32 w-32 mb-2">
          <Image
            src={tier.pokemonImage}
            alt={tier.name}
            width={200}
            height={200}
            className="object-contain"
          />
        </div>
        <CardTitle className="text-xl">{tier.name}</CardTitle>
        <CardDescription className="text-center">
          {tier.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-6">
        <div className="mb-4 flex items-baseline text-center">
          <span className="text-4xl font-bold">€{price.toFixed(2)}</span>
          <span className="ml-1 text-muted-foreground">
            {paymentFrequency === "monthly" ? "" : "/year"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          €{pricePerCredit} per credit
        </p>
        <div className="w-full space-y-2">
          <div className="flex items-center justify-center gap-2 rounded-md bg-primary/10 p-2 font-medium text-primary">
            <span>{tier.credits} Credits</span>
          </div>
          <ul className="space-y-2.5 text-sm leading-tight">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter className="mt-auto p-6 pt-0">
        <Button
          className={cn("w-full", tier.featured ? "" : "bg-primary/90 hover:bg-primary")}
          data-price-id={tier.priceId}
          data-package-id={tier.id}
          disabled={isLoading || !tier.priceId}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Get Started
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 