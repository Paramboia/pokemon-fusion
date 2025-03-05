import Stripe from 'stripe';

// Initialize Stripe with the secret key from environment variables
// Use a function to create the Stripe instance to avoid initialization errors during build
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  // Only try to initialize Stripe in a runtime context, not during build
  if (typeof process.env.STRIPE_SECRET_KEY !== 'string') {
    throw new Error('Stripe API key is missing. Please check your environment variables.');
  }
  
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16', // Use the latest API version
      appInfo: {
        name: 'Pokemon Fusion',
        version: '1.0.0',
      },
    });
  }
  
  return stripeInstance;
}

// For backward compatibility
export const stripe = typeof window === 'undefined' ? getStripe() : null as any;

// Credit package IDs in Stripe (to be created in Stripe dashboard)
export const CREDIT_PACKAGES = {
  STARTER: {
    credits: 5,
    price_cents: 150,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_5_CREDITS,
  },
  STANDARD: {
    credits: 20,
    price_cents: 500,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_20_CREDITS,
  },
  VALUE: {
    credits: 50,
    price_cents: 1000,
    stripe_price_id: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_50_CREDITS,
  },
};

// Function to get credit package by Stripe price ID
export function getCreditPackageByPriceId(priceId: string) {
  return Object.values(CREDIT_PACKAGES).find(
    (pkg) => pkg.stripe_price_id === priceId
  );
} 