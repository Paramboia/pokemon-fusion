import Image from "next/image"
import { Check, CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface PricingTier {
  name: string
  description?: string
  price: {
    monthly: number
    yearly: number
  }
  features?: string[]
  featured?: boolean
  credits: number
  priceId: string
  id: string
  pokemonImage: string
  pokemonName?: string
  themeColor?: string
  borderColor?: string
  bgColor?: string
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
        "flex flex-col overflow-hidden border transition-all duration-300 hover:shadow-lg",
        tier.featured ? "border-primary shadow-md scale-105" : tier.borderColor || "",
        tier.bgColor || ""
      )}
    >
      <CardHeader className={cn("flex flex-col items-center space-y-1 pb-2")}>
        <div className="relative h-32 w-32 mb-2">
          <Image
            src={tier.pokemonImage}
            alt={tier.name}
            width={200}
            height={200}
            className="object-contain drop-shadow-md hover:scale-110 transition-transform duration-300"
            priority
          />
        </div>
        <CardTitle 
          className={cn(
            "text-xl font-bold tracking-tight",
            tier.themeColor ? `bg-gradient-to-r ${tier.themeColor} bg-clip-text text-transparent` : 
            "bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent",
            "drop-shadow-sm"
          )}
        >
          {tier.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center p-6">
        <p className="text-2xl font-bold mb-4">
          {tier.credits} credits
        </p>
        <div className="mb-2 flex items-baseline text-center">
          <span className="text-4xl font-bold">€{price.toFixed(2)}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          €{pricePerCredit} per credit
        </p>
      </CardContent>
      <CardFooter className="mt-auto p-6 pt-0">
        <Button
          className={cn("w-full", 
            tier.featured ? "" : "bg-gradient-to-r " + (tier.themeColor || "from-primary to-primary/80")
          )}
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