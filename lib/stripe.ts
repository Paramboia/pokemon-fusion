import Stripe from 'stripe';

// Initialize Stripe with the secret key from environment variables
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Use the latest API version
  appInfo: {
    name: 'Pokemon Fusion',
    version: '1.0.0',
  },
});

// Credit package IDs in Stripe (to be created in Stripe dashboard)
export const CREDIT_PACKAGES = {
  STARTER: {
    credits: 5,
    price_cents: 150,
    stripe_price_id: process.env.STRIPE_PRICE_ID_5_CREDITS,
  },
  STANDARD: {
    credits: 20,
    price_cents: 500,
    stripe_price_id: process.env.STRIPE_PRICE_ID_20_CREDITS,
  },
  VALUE: {
    credits: 50,
    price_cents: 1000,
    stripe_price_id: process.env.STRIPE_PRICE_ID_50_CREDITS,
  },
};

// Function to get credit package by Stripe price ID
export function getCreditPackageByPriceId(priceId: string) {
  return Object.values(CREDIT_PACKAGES).find(
    (pkg) => pkg.stripe_price_id === priceId
  );
} 