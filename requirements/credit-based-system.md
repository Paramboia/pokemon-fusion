# Credit-Based System for Pokémon Fusion

This document outlines the implementation of a credit-based payment system for the Pokémon Fusion application, allowing users to purchase credits to generate fusions.

## Overview

The credit-based system follows a "Pay-as-You-Go" model where users purchase credits that are consumed when generating Pokémon fusions. This monetization strategy provides flexibility for users while creating a sustainable revenue stream for the application.

## Pricing Structure

The application offers three credit packages:

| Package Name | Credits | Price (EUR) | Price per Credit |
|--------------|---------|-------------|------------------|
| Starter Pack | 5       | €1.50       | €0.30            |
| Standard Pack| 20      | €5.00       | €0.25            |
| Value Pack   | 50      | €10.00      | €0.20            |

Each fusion generation costs 1 credit.

## Database Schema

### Tables

1. **Users Table (Extended)**
   - Added `credits_balance` (INTEGER, NOT NULL, DEFAULT 0) to track available credits

2. **Credit Packages Table**
   ```sql
   CREATE TABLE public.credit_packages (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     credits INTEGER NOT NULL,
     price_cents INTEGER NOT NULL,
     currency TEXT NOT NULL DEFAULT 'EUR',
     is_active BOOLEAN NOT NULL DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     
     CONSTRAINT positive_credits CHECK (credits > 0),
     CONSTRAINT positive_price CHECK (price_cents > 0)
   );
   ```

3. **Credits Transactions Table**
   ```sql
   CREATE TABLE public.credits_transactions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
     amount INTEGER NOT NULL, -- positive for purchases, negative for usage
     transaction_type TEXT NOT NULL, -- 'purchase', 'usage', 'admin_adjustment', 'refund', etc.
     package_id UUID REFERENCES public.credit_packages(id), -- NULL for usage transactions
     payment_id TEXT, -- external payment processor ID (for purchases)
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     description TEXT,
     
     CONSTRAINT amount_not_zero CHECK (amount != 0)
   );
   ```

### Database Functions

1. **Use Credits Function**
   ```sql
   CREATE OR REPLACE FUNCTION public.use_credits(
     user_id UUID,
     credits_to_use INTEGER,
     description TEXT DEFAULT 'Fusion generation'
   )
   RETURNS BOOLEAN
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   DECLARE
     current_balance INTEGER;
   BEGIN
     -- Get current balance
     SELECT credits_balance INTO current_balance
     FROM public.users
     WHERE id = user_id;
     
     -- Check if user has enough credits
     IF current_balance < credits_to_use THEN
       RETURN FALSE;
     END IF;
     
     -- Update user's balance
     UPDATE public.users
     SET credits_balance = credits_balance - credits_to_use
     WHERE id = user_id;
     
     -- Record the transaction
     INSERT INTO public.credits_transactions (
       user_id,
       amount,
       transaction_type,
       description
     ) VALUES (
       user_id,
       -credits_to_use,
       'usage',
       description
     );
     
     RETURN TRUE;
   END;
   $$;
   ```

2. **Add Credits Function**
   ```sql
   CREATE OR REPLACE FUNCTION public.add_credits(
     user_id UUID,
     credits_to_add INTEGER,
     transaction_type TEXT,
     package_id UUID DEFAULT NULL,
     payment_id TEXT DEFAULT NULL,
     description TEXT DEFAULT 'Credit purchase'
   )
   RETURNS VOID
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     -- Update user's balance
     UPDATE public.users
     SET credits_balance = credits_balance + credits_to_add
     WHERE id = user_id;
     
     -- Record the transaction
     INSERT INTO public.credits_transactions (
       user_id,
       amount,
       transaction_type,
       package_id,
       payment_id,
       description
     ) VALUES (
       user_id,
       credits_to_add,
       transaction_type,
       package_id,
       payment_id,
       description
     );
   END;
   $$;
   ```

## API Endpoints

### Credit Management

1. **GET /api/credits/balance**
   - Returns the user's current credit balance
   - Authentication required

2. **GET /api/credits/packages**
   - Returns a list of available credit packages
   - Authentication required

3. **POST /api/credits/use**
   - Deducts credits from the user's balance
   - Authentication required
   - Request body: `{ description?: string }`
   - Returns: `{ success: boolean, balance: number }`
   - Returns 402 status code if insufficient credits

4. **POST /api/credits/refund**
   - Refunds credits to the user's balance (for failed operations)
   - Authentication required
   - Request body: `{ description?: string }`
   - Returns: `{ success: boolean, balance: number }`

### Payment Processing

1. **POST /api/credits/checkout**
   - Creates a Stripe checkout session for purchasing credits
   - Authentication required
   - Request body: `{ priceId: string, successUrl?: string, cancelUrl?: string }`
   - Returns: `{ sessionId: string, url: string }`

2. **POST /api/webhooks/stripe**
   - Handles Stripe webhook events (payment confirmations)
   - No authentication (uses Stripe signature verification)
   - Adds credits to user accounts after successful payments

## Frontend Components

### Pages

1. **Credits Page (`/app/credits/page.tsx`)**
   - Displays the user's credit balance
   - Lists available credit packages for purchase
   - Handles the purchase flow

2. **Success Page (`/app/credits/success/page.tsx`)**
   - Displayed after a successful payment
   - Confirms the credit purchase

3. **Cancel Page (`/app/credits/cancel/page.tsx`)**
   - Displayed when a payment is cancelled
   - Provides options to try again

### Components

1. **Credit Balance Component (`/components/CreditBalance.tsx`)**
   - Displays the user's current credit balance in the header
   - Links to the Credits page

### Hooks

1. **useCredits Hook (`/hooks/useCredits.ts`)**
   - Manages credit-related state and operations
   - Provides functions for fetching balance, packages, and handling purchases

## Integration with Fusion Generation

The fusion generation process has been updated to require credits:

1. Before generating a fusion, the system checks if the user has sufficient credits
2. If sufficient, it deducts 1 credit and proceeds with generation
3. If insufficient, it returns a 402 Payment Required status
4. If generation fails after deducting credits, it automatically refunds the credit

## Stripe Integration

### Environment Variables

```
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs
STRIPE_PRICE_ID_5_CREDITS=price_id_for_5_credits
STRIPE_PRICE_ID_20_CREDITS=price_id_for_20_credits
STRIPE_PRICE_ID_50_CREDITS=price_id_for_50_credits
```

### Stripe Setup Requirements

1. Create a Stripe account and obtain API keys
2. Create products and prices in the Stripe dashboard that match the credit packages
3. Set up a webhook endpoint in the Stripe dashboard pointing to `/api/webhooks/stripe`
4. Update the environment variables with the actual Stripe keys and price IDs

## Testing

### Test Credit Purchases

Use Stripe's test cards to simulate successful and failed payments:

- **Successful payment**: 4242 4242 4242 4242
- **Failed payment**: 4000 0000 0000 0002

### Test Credit Usage

1. Generate a fusion with sufficient credits
2. Attempt to generate a fusion with insufficient credits
3. Verify that credits are properly deducted and refunded

## Future Enhancements

1. **Subscription Model**
   - Implement a subscription option for unlimited fusions
   - Offer tiered subscription plans with different benefits

2. **Promotional Credits**
   - Implement a system for giving free credits to new users
   - Create promotional campaigns with discounted credit packages

3. **Credit Expiration**
   - Add an optional expiration date for credits
   - Implement a notification system for expiring credits

4. **Admin Dashboard**
   - Create an admin interface for managing credit packages
   - Provide analytics on credit purchases and usage

5. **Referral System**
   - Reward users with credits for referring new users
   - Track referral conversions and credit allocations 