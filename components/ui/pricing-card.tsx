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
        "flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg border-0",
        tier.bgColor || ""
      )}
    >
      {tier.featured ? (
        <div className="h-1 w-full bg-gradient-to-r from-primary/80 to-primary"></div>
      ) : (
        <div className="h-1 w-full"></div>
      )}
      <CardHeader className={cn("flex flex-col items-center space-y-1 pb-2 h-[180px] justify-start pt-4")}>
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
      <CardContent className="flex flex-col items-center p-6 flex-1">
        <div className="flex flex-col items-center space-y-4 w-full">
          {/* Credits display */}
          <div className="flex items-center justify-center w-full">
            <div className={cn(
              "px-4 py-2 rounded-full",
              tier.borderColor ? tier.borderColor.replace('border-', 'bg-') + '/20' : "bg-primary/20",
              "text-center"
            )}>
              <span className="text-2xl font-bold">
                {tier.credits} credits
              </span>
            </div>
          </div>
          
          {/* Price display */}
          <div className="flex flex-col items-center">
            <span className={cn(
              "text-4xl font-bold",
              tier.themeColor ? `text-gradient bg-gradient-to-r ${tier.themeColor} bg-clip-text text-transparent` : ""
            )}>
              €{price.toFixed(2)}
            </span>
            <span className="text-sm mt-1 text-muted-foreground font-medium">
              €{pricePerCredit} per credit
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-auto p-6 pt-0">
        <Button
          className={cn("w-full", 
            "bg-gradient-to-r " + (tier.themeColor || "from-primary to-primary/80")
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
              Purchase
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 