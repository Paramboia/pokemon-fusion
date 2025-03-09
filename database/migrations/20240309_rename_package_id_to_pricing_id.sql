-- Rename package_id to pricing_id in credits_transactions table
ALTER TABLE public.credits_transactions 
  RENAME COLUMN package_id TO pricing_id;

-- Change the data type from UUID to TEXT
ALTER TABLE public.credits_transactions 
  ALTER COLUMN pricing_id TYPE TEXT USING pricing_id::TEXT;

-- Drop the foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'credits_transactions_package_id_fkey' 
    AND table_name = 'credits_transactions'
  ) THEN
    ALTER TABLE public.credits_transactions 
      DROP CONSTRAINT credits_transactions_package_id_fkey;
  END IF;
END $$;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN public.credits_transactions.pricing_id IS 'Stripe price ID associated with this transaction';

-- Create an index for faster lookups by pricing_id
CREATE INDEX IF NOT EXISTS idx_credits_transactions_pricing_id ON public.credits_transactions(pricing_id); 